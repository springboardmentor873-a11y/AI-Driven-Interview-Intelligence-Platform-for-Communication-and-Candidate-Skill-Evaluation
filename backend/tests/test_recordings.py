from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.interviews import recordings
from apps.interviews.models import InterviewSession

SESSIONS = "/api/interviews/sessions/"
WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 200
MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 200
WAV = b"RIFF\x24\x00\x00\x00WAVEfmt " + b"\x00" * 50


@pytest.fixture(autouse=True)
def setup(settings, tmp_path):
    settings.GEMINI_API_KEY = ""
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def client(auth_client, make_user):
    return auth_client(make_user("a@example.com"))


def url(sid, query=""):
    return f"{SESSIONS}{sid}/recording/{query}"


def file(name, data, kind="application/octet-stream"):
    return SimpleUploadedFile(name, data, content_type=kind)


def finished_session(client, questions=2):
    sid = client.post(SESSIONS, {"interview_type": "hr", "question_count": questions}, format="json").data["id"]
    client.post(f"{SESSIONS}{sid}/start/")
    client.post(f"{SESSIONS}{sid}/finish/")
    return sid


def upload(client, sid, **files):
    return client.post(url(sid), files, format="multipart")


def stored(settings):
    return sorted(p.name for p in Path(settings.MEDIA_ROOT).rglob("*") if p.is_file())


# --- format detection ---------------------------------------------------------------

@pytest.mark.parametrize("head,expected", [
    (WEBM[:16], "webm"), (MP4[:16], "mp4"), (b"OggS" + b"\x00" * 12, "ogg"), (WAV[:16], "wav"),
    (b"ID3\x04" + b"\x00" * 12, "mp3"), (b"\xff\xfb\x90\x00" + b"\x00" * 12, "mp3"),
    (b"<script>alert(1)</script>", None), (b"%PDF-1.4 hello world", None), (b"", None),
])
def test_detect_format(head, expected):
    assert recordings.detect_format(head) == expected


# --- uploading ----------------------------------------------------------------------

def test_upload_video_and_audio(client, settings):
    sid = finished_session(client)
    res = upload(client, sid, video=file("anything.bin", WEBM), audio=file("a.txt", WEBM))
    assert res.status_code == 200 and res.data["has_video"] and res.data["has_audio"]
    names = stored(settings)
    # names are made by us from the detected type; the client's names are ignored
    assert len(names) == 2 and all(n.startswith(f"session-{sid}-") and n.endswith(".webm") for n in names)
    assert "anything" not in "".join(names)


def test_formats_get_matching_extensions(client, settings):
    sid = finished_session(client)
    upload(client, sid, video=file("v", MP4), audio=file("a", MP4))
    assert sorted(n.rsplit(".", 1)[1] for n in stored(settings)) == ["m4a", "mp4"]


def test_audio_can_be_sent_alone(client):
    sid = finished_session(client)
    res = upload(client, sid, audio=file("a.wav", WAV))
    assert res.status_code == 200 and res.data["has_audio"] and not res.data["has_video"]


@pytest.mark.parametrize("make_files", [
    lambda: {},
    lambda: {"video": file("v.webm", b"")},
    lambda: {"video": file("v.webm", b"just some text pretending to be video")},
    lambda: {"video": file("v.webm", b"<script>alert(1)</script>")},
    lambda: {"video": file("v.wav", WAV)},  # audio-only formats are not accepted as video
    lambda: {"audio": file("a.webm", b"%PDF-1.4 not audio")},
])
def test_bad_uploads_are_rejected(client, make_files):
    sid = finished_session(client)
    assert upload(client, sid, **make_files()).status_code == 400
    assert not InterviewSession.objects.get(id=sid).video_file


def test_too_large_is_rejected(client, monkeypatch):
    monkeypatch.setitem(recordings.MAX_BYTES, "video", 100)
    sid = finished_session(client)
    res = upload(client, sid, video=file("v.webm", WEBM))
    assert res.status_code == 400 and "too large" in res.data["video"]


def test_one_bad_file_saves_nothing(client, settings):
    sid = finished_session(client)
    res = upload(client, sid, video=file("v.webm", WEBM), audio=file("a.webm", b"nope nope nope nope"))
    assert res.status_code == 400
    assert stored(settings) == [] and not InterviewSession.objects.get(id=sid).video_file


def test_only_finished_interviews_accept_recordings(client):
    scheduled = client.post(SESSIONS, {"interview_type": "hr", "question_count": 2}, format="json").data["id"]
    assert upload(client, scheduled, video=file("v", WEBM)).status_code == 400
    client.post(f"{SESSIONS}{scheduled}/start/")
    assert upload(client, scheduled, video=file("v", WEBM)).status_code == 400  # still running
    cancelled = client.post(SESSIONS, {"interview_type": "hr", "question_count": 2}, format="json").data["id"]
    client.post(f"{SESSIONS}{cancelled}/cancel/")
    assert upload(client, cancelled, video=file("v", WEBM)).status_code == 400


def test_retry_replaces_the_earlier_file(client, settings):
    sid = finished_session(client)
    upload(client, sid, video=file("v", WEBM))
    first = stored(settings)
    upload(client, sid, video=file("v", WEBM + b"more"))
    second = stored(settings)
    assert len(second) == 1 and second != first  # old file is gone, not left behind


# --- download and delete ----------------------------------------------------------------

def test_owner_can_download(client):
    sid = finished_session(client)
    upload(client, sid, video=file("v", WEBM), audio=file("a", WAV))
    video = client.get(url(sid))
    assert video.status_code == 200 and video["Content-Type"] == "video/webm"
    assert b"".join(video.streaming_content) == WEBM
    assert video["X-Content-Type-Options"] == "nosniff" and "no-store" in video["Cache-Control"]
    audio = client.get(url(sid, "?type=audio"))
    assert audio["Content-Type"] == "audio/wav" and b"".join(audio.streaming_content) == WAV


def test_download_errors(client):
    sid = finished_session(client)
    assert client.get(url(sid)).status_code == 404  # nothing uploaded yet
    assert client.get(url(sid, "?type=secrets")).status_code == 400


def test_delete_removes_files(client, settings):
    sid = finished_session(client)
    upload(client, sid, video=file("v", WEBM), audio=file("a", WAV))
    res = client.delete(url(sid))
    assert res.status_code == 200 and not res.data["has_video"] and not res.data["has_audio"]
    assert stored(settings) == [] and client.get(url(sid)).status_code == 404


def test_deleting_a_session_or_user_removes_its_files(client, settings, make_user):
    sid = finished_session(client)
    upload(client, sid, video=file("v", WEBM))
    assert len(stored(settings)) == 1
    InterviewSession.objects.get(id=sid).candidate.delete()  # cascades to the session
    assert stored(settings) == []


# --- privacy -------------------------------------------------------------------------------

@pytest.mark.parametrize("method", ["get", "post", "delete"])
def test_other_candidates_get_404(client, auth_client, make_user, method):
    sid = finished_session(client)
    upload(client, sid, video=file("v", WEBM))
    other = auth_client(make_user("b@example.com"))
    kwargs = {"data": {"video": file("v", WEBM)}, "format": "multipart"} if method == "post" else {}
    assert getattr(other, method)(url(sid), **kwargs).status_code == 404
    assert InterviewSession.objects.get(id=sid).video_file  # untouched


def test_recruiters_and_anonymous_are_blocked(client, auth_client, make_user, api):
    sid = finished_session(client)
    upload(client, sid, video=file("v", WEBM))
    assert auth_client(make_user("r@example.com", role="recruiter")).get(url(sid)).status_code == 403
    assert api.get(url(sid)).status_code == 401
