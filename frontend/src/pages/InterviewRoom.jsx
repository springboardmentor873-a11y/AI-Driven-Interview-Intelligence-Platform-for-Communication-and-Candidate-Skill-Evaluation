import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import CameraPreview from "../components/CameraPreview";
import QuestionCard from "../components/QuestionCard";
import useAudioLevel from "../hooks/useAudioLevel";
import useMediaStream from "../hooks/useMediaStream";
import client from "../api/client";
import { parseError } from "../utils/errors";

const TYPES = { hr: "HR", technical: "Technical", behavioral: "Behavioral", aptitude: "Aptitude" };
const LEVELS = { easy: "Easy", medium: "Medium", hard: "Hard" };
const url = (id, action = "") => `/api/interviews/sessions/${id}/${action}`;

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | check | live | done | error
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const media = useMediaStream();
  const level = useAudioLevel(media.stream);

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

  const begin = async () => {
    setError("");
    try {
      const { data } = await client.post(url(id, "start/"));
      setSession(data);
      setQuestion(data.next_question);
      setProgress({ answered: data.answered_count, total: data.question_total });
      setPhase("live");
    } catch (err) {
      setError(parseError(err).general || "Could not start this interview.");
    }
  };

  const showResult = (data) => {
    media.stop();
    setSession(data);
    setProgress({ answered: data.answered_count, total: data.question_total });
    setPhase("done");
  };

  const submit = async (seconds) => {
    if (busyRef.current) return; // ignore a second click or a timer firing while saving
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await client.post(url(id, "answer/"), { question_id: question.id, duration_seconds: seconds });
      setProgress({ answered: data.answered, total: data.total });
      if (data.next_question) {
        setQuestion(data.next_question);
      } else {
        showResult((await client.get(url(id))).data);
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
          <CameraPreview stream={media.stream} level={level} />
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
            <QuestionCard
              key={question.id}
              question={question}
              index={question.order}
              total={progress.total}
              busy={busy}
              onSubmit={submit}
            />
            {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          </div>
          <div className="space-y-4">
            <CameraPreview stream={media.stream} level={level} />
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
          Scores and feedback will appear here in the next release.
        </p>
      )}
      {error && <p className="mt-4 text-red-300">{error}</p>}
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
