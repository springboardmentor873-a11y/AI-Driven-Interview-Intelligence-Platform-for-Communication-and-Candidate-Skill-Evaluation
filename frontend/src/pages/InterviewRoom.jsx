import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import AttentionBadge from "../components/AttentionBadge";
import CameraPreview from "../components/CameraPreview";
import AnswerAnalysis from "../components/AnswerAnalysis";
import QuestionCard from "../components/QuestionCard";
import FeedbackPanel from "../components/FeedbackPanel";
import ScoreCard from "../components/ScoreCard";
import SpeechSummary from "../components/SpeechSummary";
import useAudioLevel from "../hooks/useAudioLevel";
import useMediaStream from "../hooks/useMediaStream";
import useAttentionTracker from "../hooks/useAttentionTracker";
import useRecorder, { extensionFor } from "../hooks/useRecorder";
import client from "../api/client";
import { parseError } from "../utils/errors";

const TYPES = { hr: "HR", technical: "Technical", behavioral: "Behavioral", aptitude: "Aptitude" };
const LEVELS = { easy: "Easy", medium: "Medium", hard: "Hard" };
const url = (id, action = "") => `/api/interviews/sessions/${id}/${action}`;

/** One line about the answer that was just saved. Shown above the next question for a few seconds. */
function AnswerNote({ feedback }) {
  if (feedback.status === "no_transcript") {
    return (
      <p role="status" className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        No words were captured for your last answer. Check your microphone, or press "Type instead" for the next one.
      </p>
    );
  }
  const parts = [];
  if (feedback.wpm) parts.push(`${feedback.wpm} wpm (${feedback.pace_label})`);
  if (feedback.fillers != null) parts.push(feedback.fillers === 1 ? "1 filler word" : `${feedback.fillers} filler words`);
  if (feedback.eye_contact_pct != null) parts.push(`eye contact ${Math.round(feedback.eye_contact_pct)}%`);
  if (!parts.length) parts.push(`${feedback.word_count} words`);
  return (
    <p role="status" className="mb-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
      Answer saved. Last answer: {parts.join(" - ")}.
    </p>
  );
}

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | check | live | done | error
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState({ state: "idle", percent: 0, message: "" });
  const [analysis, setAnalysis] = useState({ state: "idle", source: "" }); // idle | running | done | failed
  const [feedbackState, setFeedbackState] = useState("idle"); // idle | running | done | failed
  const [feedback, setFeedback] = useState(null); // quick numbers about the answer just saved
  const feedbackTimer = useRef(null);
  const busyRef = useRef(false);
  const filesRef = useRef(null); // the recording, kept until it is safely uploaded
  const media = useMediaStream();
  const attention = useAttentionTracker(media.stream);
  const recorder = useRecorder();
  const level = useAudioLevel(media.stream);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  useEffect(() => {
    let alive = true;
    client
      .get(url(id))
      .then(({ data }) => {
        if (!alive) return;
        setSession(data);
        setProgress({ answered: data.answered_count, total: data.question_total });
        setPhase(data.status === "completed" || data.status === "cancelled" ? "done" : "check");
      })
      .catch(() => alive && setPhase("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  const runFeedback = useCallback(async () => {
    setFeedbackState("running");
    try {
      const { data } = await client.post(url(id, "feedback/"));
      setSession((s) => ({ ...s, feedback: data.feedback }));
      setFeedbackState("done");
    } catch {
      setFeedbackState("failed");
    }
  }, [id]);

  const runAnalysis = useCallback(async () => {
    setAnalysis({ state: "running", source: "" });
    try {
      const { data } = await client.post(url(id, "score/"));
      // Only the questions change: the recording upload may be updating the rest at the same time
      setSession((s) => ({ ...s, questions: data.questions, speech_summary: data.speech_summary, score: data.score }));
      setAnalysis({ state: "done", source: data.analysis_source });
      if (data.score) runFeedback(); // the feedback is written from the score
    } catch {
      setAnalysis({ state: "failed", source: "" });
    }
  }, [id, runFeedback]);

  const begin = async () => {
    setError("");
    try {
      const { data } = await client.post(url(id, "start/"));
      setSession(data);
      setQuestion(data.next_question);
      setProgress({ answered: data.answered_count, total: data.question_total });
      attention.reset(); // eye-contact numbers count from the first question, not from the camera check
      setPhase("live");
      recorder.start(media.stream); // nothing happens if there is no camera or this browser cannot record
    } catch (err) {
      setError(parseError(err).general || "Could not start this interview.");
    }
  };

  const sendRecording = async () => {
    const files = filesRef.current;
    if (!files) return;
    const body = new FormData();
    if (files.video) body.append("video", files.video, `video.${extensionFor(files.video)}`);
    if (files.audio) body.append("audio", files.audio, `audio.${extensionFor(files.audio)}`);
    setUpload({ state: "uploading", percent: 0, message: "" });
    try {
      const { data } = await client.post(url(id, "recording/"), body, {
        onUploadProgress: (e) => e.total && setUpload({ state: "uploading", percent: Math.round((e.loaded / e.total) * 100), message: "" }),
      });
      filesRef.current = null;
      setSession((s) => ({ ...s, has_video: data.has_video, has_audio: data.has_audio }));
      setUpload({ state: "done", percent: 100, message: "" });
    } catch (err) {
      setUpload({ state: "failed", percent: 0, message: parseError(err).general || "Could not upload your recording." });
    }
  };

  const deleteRecording = async () => {
    if (!window.confirm("Delete the recording of this interview? This cannot be undone.")) return;
    try {
      await client.delete(url(id, "recording/"));
      setSession((s) => ({ ...s, has_video: false, has_audio: false }));
      setUpload({ state: "idle", percent: 0, message: "" });
    } catch (err) {
      setError(parseError(err).general || "Could not delete the recording.");
    }
  };

  const showResult = async (data) => {
    setSession(data);
    setProgress({ answered: data.answered_count, total: data.question_total });
    setPhase("done");
    runAnalysis(); // runs alongside the recording upload
    const files = await recorder.stop(); // stop recording before the camera is switched off
    media.stop();
    if (files) {
      filesRef.current = files;
      await sendRecording();
    }
  };

  const submit = async (seconds, extra = {}) => {
    if (busyRef.current) return; // ignore a second click or a timer firing while saving
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const body = { question_id: question.id, duration_seconds: seconds, ...extra };
      const measured = seconds > 0 ? attention.snapshot() : null; // a skipped question has nothing to measure
      if (measured && measured.tracked_seconds >= 5) body.attention = measured;
      const look = seconds > 0 ? attention.expressionSnapshot() : null;
      if (look && look.face_seconds >= 5) body.expression = look;
      const { data } = await client.post(url(id, "answer/"), body);
      attention.reset(); // the next question starts a fresh measurement
      setProgress({ answered: data.answered, total: data.total });
      if (data.next_question) {
        setQuestion(data.next_question);
        clearTimeout(feedbackTimer.current);
        setFeedback(data.feedback?.status === "skipped" ? null : data.feedback);
        feedbackTimer.current = setTimeout(() => setFeedback(null), 9000);
      } else {
        showResult((await client.get(url(id))).data); // runs in the background: the recording uploads after
      }
    } catch (err) {
      setError(parseError(err).general || "Could not save your answer. Press submit to try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const endEarly = async () => {
    if (!window.confirm("End the interview now? Questions you have not answered stay unanswered.")) return;
    setError("");
    try {
      showResult((await client.post(url(id, "finish/"))).data);
    } catch (err) {
      setError(parseError(err).general || "Could not end the interview.");
    }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this interview?")) return;
    try {
      await client.post(url(id, "cancel/"));
      navigate("/interview");
    } catch (err) {
      setError(parseError(err).general || "Could not cancel the interview.");
    }
  };

  const shell = (children) => (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );

  if (phase === "loading") return shell(<p className="text-white/60">Loading your interview...</p>);
  if (phase === "error") {
    return shell(
      <div>
        <p className="text-red-300">We could not find this interview.</p>
        <Link to="/interview" className="mt-4 inline-block font-semibold text-brand-400">Back to my interviews</Link>
      </div>,
    );
  }

  const heading = session && [TYPES[session.interview_type], LEVELS[session.difficulty], session.domain].filter(Boolean).join(" · ");

  if (phase === "check") {
    const resuming = session.status === "in_progress";
    return shell(
      <>
        <p className="text-sm font-semibold text-brand-400">{heading}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{resuming ? "Resume your interview" : "Get ready"}</h1>
        <p className="mt-2 text-white/60">
          {session.question_total} questions, each with its own timer. Speak clearly and look at the camera. Once a question
          starts, the clock does not stop.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <CameraPreview stream={media.stream} level={level} />
            <AttentionBadge status={attention.status} state={attention.state} expression={attention.expression} />
          </div>
          <div className="space-y-4">
            <ol className="space-y-2 text-sm text-white/70">
              <li>1. Allow your camera and microphone.</li>
              <li>2. Check that you can see yourself and the mic bar moves when you speak.</li>
              <li>3. Press {resuming ? "Resume" : "Start"} when you are ready.</li>
            </ol>
            {media.status === "error" && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{media.message}</p>}
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-3">
              {media.status !== "ready" ? (
                <Button variant="solid" onClick={media.request} disabled={media.status === "asking"}>
                  {media.status === "asking" ? "Waiting for permission..." : media.status === "error" ? "Try again" : "Allow camera and microphone"}
                </Button>
              ) : (
                <Button variant="solid" onClick={begin}>{resuming ? "Resume interview" : "Start interview"}</Button>
              )}
              <Button variant="ghost" onClick={cancel}>Cancel interview</Button>
            </div>
            {media.status !== "ready" && (
              <button type="button" onClick={begin} className="text-sm text-white/40 underline hover:text-white/70">
                Continue without camera and microphone
              </button>
            )}
          </div>
        </div>
      </>,
    );
  }

  if (phase === "live") {
    return shell(
      <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-400">{heading}</p>
          <p className="text-sm text-white/50">{progress.answered} of {progress.total} answered</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            {feedback && <AnswerNote feedback={feedback} />}
            <QuestionCard
              key={question.id}
              question={question}
              index={question.order}
              total={progress.total}
              busy={busy}
              micReady={Boolean(media.stream)}
              onSubmit={submit}
            />
            {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          </div>
          <div className="space-y-4">
            <CameraPreview stream={media.stream} level={level} />
            <AttentionBadge status={attention.status} state={attention.state} expression={attention.expression} />
            <Button variant="ghost" className="w-full !text-red-300" onClick={endEarly}>End interview</Button>
          </div>
        </div>
      </>,
    );
  }

  // phase === "done"
  const cancelled = session.status === "cancelled";
  const questions = session.questions || [];
  const seconds = questions.reduce((sum, q) => sum + (q.answer?.duration_seconds || 0), 0);
  return shell(
    <>
      <p className="text-sm font-semibold text-brand-400">{heading}</p>
      <h1 className="mt-1 text-3xl font-extrabold">{cancelled ? "Interview cancelled" : "Interview complete"}</h1>
      {!cancelled && (
        <p className="mt-2 text-white/60">
          You answered {progress.answered} of {progress.total} questions in about {Math.max(1, Math.round(seconds / 60))} minute(s).
          Your score, written feedback and the analysis of each answer are below.
        </p>
      )}
      {analysis.state === "running" && <p className="mt-3 text-sm text-white/60">Scoring your interview...</p>}
      {analysis.state === "failed" && (
        <p className="mt-3 text-sm text-red-300">
          Could not analyse your answers.{" "}
          <button type="button" onClick={runAnalysis} className="font-semibold underline">Try again</button>
        </p>
      )}
      {analysis.state === "done" && analysis.source === "basic" && (
        <p className="mt-3 text-sm text-white/50">
          The AI review was not available, so some parts are basic estimates or not measured.{" "}
          <button type="button" onClick={runAnalysis} className="font-semibold underline">Try the AI review again</button>
        </p>
      )}
      {!cancelled && !session.score && analysis.state === "idle" && (
        <div className="mt-4"><Button variant="solid" onClick={runAnalysis}>Score this interview</Button></div>
      )}
      {!cancelled && !session.score && analysis.state === "done" && (
        <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/60">
          There was nothing to score: every question was skipped or no words were captured. Check your microphone and use Chrome or Edge, or type your answers.
        </p>
      )}
      {!cancelled && <ScoreCard score={session.score} />}
      {!cancelled && session.score && (
        <FeedbackPanel feedback={session.feedback} state={feedbackState} canWrite onWrite={runFeedback} />
      )}
      {!cancelled && <SpeechSummary summary={session.speech_summary} />}
      {error && <p className="mt-4 text-red-300">{error}</p>}
      {upload.state === "uploading" && (
        <div className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
          Saving your recording... {upload.percent}%. Keep this page open until it finishes.
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${upload.percent}%` }} />
          </div>
        </div>
      )}
      {(session.has_video || session.has_audio) && upload.state !== "uploading" && (
        <p className="mt-4 text-sm text-white/60">
          Your recording is saved privately. Only you can see it.{" "}
          <button type="button" onClick={deleteRecording} className="font-semibold text-red-300 underline">
            Delete recording
          </button>
        </p>
      )}
      {upload.state === "failed" && (
        <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {upload.message} Do not close this page, your recording is still here.{" "}
          <button type="button" onClick={sendRecording} className="font-semibold underline">Try again</button>
        </div>
      )}
      <div className="mt-6 space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="rounded-2xl border border-white/10 bg-surface px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium">
                <span className="mr-2 text-white/40">{q.order}.</span>
                {q.text}
              </p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${q.answer ? "bg-green-500/15 text-green-300" : "bg-white/10 text-white/50"}`}>
                {q.answer ? (q.answer.duration_seconds ? `${q.answer.duration_seconds}s` : "Skipped") : "Not answered"}
              </span>
            </div>
            {q.answer && <AnswerAnalysis answer={q.answer} />}
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <Link to="/interview"><Button variant="solid">New interview</Button></Link>
        <Link to="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
      </div>
    </>,
  );
}
