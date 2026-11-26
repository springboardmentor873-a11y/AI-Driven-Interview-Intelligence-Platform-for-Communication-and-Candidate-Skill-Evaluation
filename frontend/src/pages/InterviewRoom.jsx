import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function InterviewRoom() {
  const { id } = useParams();
  const nav = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active question & answer state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Media & Hardware
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/interviews/sessions/${id}/`);
        setSession(data);
        setCurrentIndex(data.current_question_index || 0);
        setTimeLeft(data.time_limit_per_question || 120);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load interview session.');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();

    // Start Webcam & Mic
    startMedia();

    return () => {
      cleanupMedia();
      clearInterval(timerRef.current);
    };
  }, [id]);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam/Mic permission not granted:', err);
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Timer logic
  useEffect(() => {
    if (session?.status === 'in_progress' && isRecording) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeExpiry();
            return 0;
          }
          return prev - 1;
        });
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, session?.status]);

  const handleStartAnswer = () => {
    setIsRecording(true);
    setElapsedTime(0);

    // Initialize browser MediaRecorder
    if (streamRef.current) {
      try {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp8,opus' });
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.warn('MediaRecorder error:', e);
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTimeExpiry = () => {
    handleStopRecording();
    handleSubmitAnswer('answered');
  };

  const handleSubmitAnswer = async (answerStatus = 'answered') => {
    if (submitting) return;
    setSubmitting(true);
    handleStopRecording();

    const currentQuestion = session.questions[currentIndex];
    try {
      const payload = {
        candidate_answer: candidateAnswer.trim(),
        time_taken_seconds: elapsedTime,
        status: answerStatus,
      };

      const { data } = await api.post(
        `/interviews/sessions/${session.id}/questions/${currentQuestion.id}/answer/`,
        payload
      );

      setSession(data);
      setCandidateAnswer('');
      setElapsedTime(0);
      setTimeLeft(data.time_limit_per_question || 120);

      const nextIdx = currentIndex + 1;
      if (nextIdx < data.questions.length) {
        setCurrentIndex(nextIdx);
      }
    } catch (err) {
      setError('Failed to record answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndEarly = async () => {
    if (!window.confirm('Are you sure you want to conclude this interview session early?')) {
      return;
    }
    handleStopRecording();
    cleanupMedia();
    try {
      const { data } = await api.post(`/interviews/sessions/${session.id}/complete/`);
      setSession(data);
    } catch (err) {
      setError('Failed to end session.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-medium text-slate-300">Entering interview room...</div>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-6 rounded-2xl max-w-md w-full text-center space-y-4 border border-slate-700">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-lg font-bold">Interview Session Error</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <Link
            to="/interview/setup"
            className="inline-block py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
          >
            Return to Setup
          </Link>
        </div>
      </div>
    );
  }

  // Completed State View
  if (session?.status === 'completed') {
    const answeredCount = session.questions.filter((q) => q.status === 'answered').length;
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur-md p-8 rounded-3xl max-w-lg w-full text-center space-y-6 border border-slate-700 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/30">
            ✓
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Mock Interview Completed!</h2>
            <p className="text-sm text-slate-400 mt-1">
              {session.target_role} • {session.interview_type.toUpperCase()}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-left">
            <div>
              <div className="text-xs text-slate-400">Total Questions</div>
              <div className="text-xl font-bold text-slate-100">{session.total_questions}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Answered</div>
              <div className="text-xl font-bold text-emerald-400">{answeredCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Difficulty</div>
              <div className="text-xl font-bold text-blue-400 capitalize">{session.difficulty}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left space-y-1">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Milestone 3 Roadmap</span>
            <p className="text-xs text-slate-300">
              Speech-to-text audio transcription, confidence monitoring, eye contact tracking, and rubric scoring are scheduled for Milestone 3!
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              to="/dashboard"
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition text-center"
            >
              Dashboard
            </Link>
            <Link
              to="/interview/setup"
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition text-center"
            >
              Start New Interview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[currentIndex] || session.questions[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
            S
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {session.target_role}
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize">
                {session.interview_type}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">
                {session.difficulty}
              </span>
            </h1>
            <p className="text-xs text-slate-400">SmartHire AI Mock Simulation (Groq LPU Engine)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Question Counter */}
          <div className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            Question {currentIndex + 1} of {session.total_questions}
          </div>

          {/* Live Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition ${
              timeLeft < 30
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-slate-800 text-blue-400 border-slate-700'
            }`}
          >
            <span>⏱️</span>
            <span>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={handleEndEarly}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Main Interview Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: AI Question & Answer Area (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* AI Question Card */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                AI Interviewer Question #{currentQ?.order || currentIndex + 1}
              </span>
              <span className="text-xs text-slate-400 capitalize">
                Round: {currentQ?.question_type}
              </span>
            </div>

            <h2 className="text-xl font-semibold text-slate-100 leading-snug">
              {currentQ?.question_text}
            </h2>

            {currentQ?.expected_answer_points && currentQ.expected_answer_points.length > 0 && (
              <details className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <summary className="cursor-pointer font-semibold text-slate-300">
                  Rubric Focus Key Points (Evaluation Criteria)
                </summary>
                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                  {currentQ.expected_answer_points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Candidate Response Area */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Candidate Notes & Answer
              </label>
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-full font-semibold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Recording ({elapsedTime}s)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Press Start Answer to begin timer</span>
                )}
              </div>
            </div>

            <textarea
              rows={6}
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              placeholder="Structure your thoughts or type notes here while answering out loud to the camera..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 font-sans"
            />

            {/* Answer Control Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartAnswer}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center gap-2"
                  >
                    <span>🎙️</span> Start Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="py-2.5 px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center gap-2"
                  >
                    <span>⏹️</span> Pause Recording
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmitAnswer('skipped')}
                  disabled={submitting}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Skip Question
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitAnswer('answered')}
                  disabled={submitting}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : currentIndex + 1 === session.total_questions ? 'Submit & Finish' : 'Next Question →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Camera & Question Drawer (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Video Feed */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`}></span>
                Candidate Video Feed
              </span>
              <span className="text-slate-500">Live Camera</span>
            </div>

            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              {isRecording && (
                <div className="absolute top-3 left-3 bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  REC
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Resolution: 640x480</span>
              <span>Audio: Active</span>
            </div>
          </div>

          {/* Question Navigation List */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Question Progress ({session.questions.filter((q) => q.status !== 'unanswered').length}/{session.total_questions})
            </h3>

            <div className="space-y-2">
              {session.questions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    idx === currentIndex
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : q.status === 'answered'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : q.status === 'skipped'
                      ? 'bg-slate-800/40 border-slate-800 text-slate-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">Q{q.order}</span>
                    <span className="truncate max-w-[200px]">{q.question_text}</span>
                  </div>
                  <div>
                    {q.status === 'answered' && <span className="text-emerald-400">✓</span>}
                    {q.status === 'skipped' && <span className="text-slate-500">Skipped</span>}
                    {idx === currentIndex && <span className="text-blue-400 font-bold">Current</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
