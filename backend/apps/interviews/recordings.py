"""Checks for interview recordings uploaded from the browser.

The browser records with MediaRecorder, which produces WebM (Chrome, Edge,
Firefox) or MP4 (Safari). The file's real type is read from its first bytes, so
a renamed text file or script is rejected, and the stored name and the type it
is served with never come from what the client claimed.
"""
from rest_framework.exceptions import ValidationError

MB = 1024 * 1024
MAX_BYTES = {"video": 300 * MB, "audio": 60 * MB}
ALLOWED_FORMATS = {
    "video": {"webm", "mp4"},
    "audio": {"webm", "mp4", "ogg", "wav", "mp3"},
}
EXTENSIONS = {
    "video": {"webm": "webm", "mp4": "mp4"},
    "audio": {"webm": "webm", "mp4": "m4a", "ogg": "ogg", "wav": "wav", "mp3": "mp3"},
}
CONTENT_TYPES = {
    "video": {"webm": "video/webm", "mp4": "video/mp4"},
    "audio": {"webm": "audio/webm", "mp4": "audio/mp4", "ogg": "audio/ogg", "wav": "audio/wav", "mp3": "audio/mpeg"},
}


def detect_format(head: bytes):
    """The media format named by a file's first bytes, or None if it is not one we accept."""
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "webm"
    if head[4:8] == b"ftyp":
        return "mp4"
    if head[:4] == b"OggS":
        return "ogg"
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "wav"
    if head[:3] == b"ID3" or (len(head) > 1 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0):
        return "mp3"
    return None


def check_upload(kind: str, upload):
    """Validate one uploaded file and return its format. Raises ValidationError."""
    if upload.size == 0:
        raise ValidationError({kind: "This file is empty."})
    if upload.size > MAX_BYTES[kind]:
        raise ValidationError({kind: f"This file is too large. The limit is {MAX_BYTES[kind] // MB} MB."})
    head = upload.read(16)
    upload.seek(0)
    fmt = detect_format(head)
    if fmt is None or fmt not in ALLOWED_FORMATS[kind]:
        raise ValidationError({kind: f"This is not a supported {kind} recording."})
    return fmt
