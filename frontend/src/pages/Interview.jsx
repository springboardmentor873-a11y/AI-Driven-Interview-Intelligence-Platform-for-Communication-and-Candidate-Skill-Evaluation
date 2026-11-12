import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PlayCircle,
  Clock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Send,
  HelpCircle,
  Sliders,
} from "lucide-react";
import { PageHeading, Badge, SectionTitle, ProgressBar } from "../components/UI";
import { interviewTracks } from "../data/demo";
import { candidateApi } from "../lib/api";

export default function Interview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Configuration state
  const [track, setTrack] = useState(() => searchParams.get("track") || "Technical");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [questionCount, setQuestionCount] = useState(3);
  const [isStarted, setIsStarted] = useState(false);

  // Device test state
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Active session runner state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [capturedResponses, setCapturedResponses] = useState([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const selectedQuestions = (interviewTracks[track]?.questions || []).slice(
    0,
    questionCount
  );

  // Global session timer
  useEffect(() => {
    if (!isStarted) return;
    const interval = setInterval(() => {
      setSessionSeconds((s) => s + 1);
      setQuestionSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted]);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const enableMedia = async () => {
    setDeviceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMicActive(true);
    } catch (err) {
      setDeviceError(
        "Camera/microphone permission not granted. You can proceed with written answers."
      );
      setCameraActive(false);
      setMicActive(false);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraActive(videoTrack.enabled);
      }
    } else {
      enableMedia();
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      }
    } else {
      enableMedia();
    }
  };

  const handleStartInterview = () => {
    setIsStarted(true);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setCapturedResponses([]);
    setSessionSeconds(0);
    setQuestionSeconds(0);
  };

  const handleNextQuestion = async () => {
    const responseItem = {
      question: selectedQuestions[currentIndex],
      answer: currentAnswer.trim(),
      duration_seconds: questionSeconds,
    };

    const nextResponses = [...capturedResponses, responseItem];
    setCapturedResponses(nextResponses);
    setCurrentAnswer("");
    setQuestionSeconds(0);

    if (currentIndex + 1 < selectedQuestions.length) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      // Completed all questions -> submit session
      await finalizeSession(nextResponses);
    }
  };

  const finalizeSession = async (allResponses) => {
    setIsSaving(true);
    // Stop camera & mic
    streamRef.current?.getTracks().forEach((t) => t.stop());

    try {
      const sessionPayload = {
        category: track,
        difficulty,
        question_count: selectedQuestions.length,
        duration_seconds: sessionSeconds,
        responses: allResponses,
        score: null, // Scored upon evaluation; not fabricated
        notes: `Candidate completed ${allResponses.length} prompt(s) in ${track} track (${difficulty}).`,
      };

      const res = await candidateApi.createInterview(sessionPayload);
      const savedId = res.data?.id;
      navigate(`/app/report?id=${savedId}`);
    } catch (err) {
      // If network fails, save to localStorage fallback and navigate
      const fallbackId = `local-${Date.now()}`;
      localStorage.setItem(
        `smarthire_session_${fallbackId}`,
        JSON.stringify({
          id: fallbackId,
          category: track,
          difficulty,
          question_count: selectedQuestions.length,
          duration_seconds: sessionSeconds,
          responses: allResponses,
          created_at: new Date().toISOString(),
        })
      );
      navigate(`/app/report?id=${fallbackId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div>
      <PageHeading
        eyebrow="PRACTICE ENVIRONMENT"
        title="Mock Interview Room"
        description="Select your target role track, test your audio/video setup, and practice structured question responses."
      />

      {!isStarted ? (
        /* Configuration Stage */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="panel lg:col-span-2 space-y-6">
            <div>
              <SectionTitle
                title="Interview Track & Discipline"
                subtitle="Choose the domain track aligned with your practice goal"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {Object.entries(interviewTracks).map(([key, data]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTrack(key)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      track === key
                        ? "border-indigo-600 bg-indigo-50/50 shadow-subtle"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">
                        {data.title}
                      </span>
                      {track === key && (
                        <CheckCircle2 size={16} className="text-indigo-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {data.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle
                title="Difficulty Level"
                subtitle="Calibrate the complexity of interview prompts"
              />
              <div className="grid grid-cols-3 gap-3 mt-3">
                {["Beginner", "Intermediate", "Advanced"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      difficulty === lvl
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle
                title="Question Set Size"
                subtitle="Select the number of prompts for this session"
              />
              <div className="flex gap-3 mt-3">
                {[3, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      questionCount === cnt
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {cnt} Questions ({cnt * 3}–{cnt * 4} min)
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Track: <strong className="text-slate-800">{track}</strong> · {difficulty} · {questionCount} prompts
              </span>
              <button onClick={handleStartInterview} className="btn-brand text-xs px-5">
                <PlayCircle size={15} />
                <span>Begin Interview Session</span>
              </button>
            </div>
          </div>

          {/* Device Setup / Environment Panel */}
          <div className="space-y-6">
            <div className="panel">
              <SectionTitle
                title="Device Readiness"
                subtitle="Optional video and microphone test"
              />

              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center text-white mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    cameraActive ? "block" : "hidden"
                  }`}
                />
                {!cameraActive && (
                  <div className="text-center p-4">
                    <Camera size={28} className="mx-auto mb-2 text-slate-400" />
                    <span className="text-xs text-slate-300 block font-medium">
                      Camera Preview Off
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Click below to test your webcam
                    </span>
                  </div>
                )}
              </div>

              {deviceError && (
                <div className="mb-3 p-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs leading-relaxed">
                  {deviceError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`btn-secondary text-xs flex-1 ${
                    cameraActive ? "bg-emerald-50 text-emerald-800 border-emerald-200" : ""
                  }`}
                >
                  {cameraActive ? <Video size={14} /> : <VideoOff size={14} />}
                  <span>{cameraActive ? "Camera On" : "Test Camera"}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`btn-secondary text-xs flex-1 ${
                    micActive ? "bg-emerald-50 text-emerald-800 border-emerald-200" : ""
                  }`}
                >
                  {micActive ? <Mic size={14} /> : <MicOff size={14} />}
                  <span>{micActive ? "Mic On" : "Test Mic"}</span>
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
                <ShieldCheck size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <span>
                  Video preview runs entirely locally in your browser to verify your lighting and framing. No video streams are transmitted to any third party.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <strong className="text-slate-800 block">Preparation Guidelines</strong>
              <ul className="text-slate-600 space-y-1 list-disc list-inside">
                <li>Structure responses using Context &rarr; Action &rarr; Result.</li>
                <li>Cite concrete projects, tradeoffs, or measurable metrics.</li>
                <li>Write clearly; take your time before submitting each prompt.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Active Interview Runner */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="panel lg:col-span-2 space-y-6">
            {/* Header / Session Stats */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Badge variant="blue">{track} Track</Badge>
                <Badge variant="slate">{difficulty}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-500 flex items-center gap-1 font-mono">
                  <Clock size={14} />
                  <span>Session: {formatTimer(sessionSeconds)}</span>
                </span>
              </div>
            </div>

            {/* Progress */}
            <div>
              <ProgressBar
                value={currentIndex + 1}
                max={selectedQuestions.length}
                label={`Question ${currentIndex + 1} of ${selectedQuestions.length}`}
                helper={`${Math.round(((currentIndex + 1) / selectedQuestions.length) * 100)}% Complete`}
              />
            </div>

            {/* Prompt Presentation */}
            <div className="py-2">
              <span className="eyebrow block mb-2">Interview Question Prompt</span>
              <h2 className="text-xl font-bold text-slate-900 leading-snug tracking-tight">
                {selectedQuestions[currentIndex]}
              </h2>
            </div>

            {/* Candidate Response Area */}
            <div>
              <label className="field-label flex items-center justify-between">
                <span>Your Response</span>
                <span className="text-slate-400 font-normal">
                  {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </label>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Structure your answer here (e.g., situation context, technical decision or action, and outcome achieved)..."
                rows={8}
                className="w-full p-3.5 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 bg-white outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-sans leading-relaxed"
              />
            </div>

            {/* Runner Navigation Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  if (confirm("End this interview session early? Progress will be cancelled.")) {
                    setIsStarted(false);
                    streamRef.current?.getTracks().forEach((t) => t.stop());
                  }
                }}
                className="btn-quiet text-xs"
              >
                <ArrowLeft size={14} />
                <span>Exit Session</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleNextQuestion}
                className="btn-primary text-xs px-5"
              >
                {isSaving ? (
                  <span>Saving Assessment...</span>
                ) : currentIndex + 1 < selectedQuestions.length ? (
                  <>
                    <span>Next Prompt</span>
                    <ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    <span>Finish & Submit Session</span>
                    <CheckCircle2 size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Side Panel with Video Monitor */}
          <div className="space-y-6">
            <div className="panel">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700">Interview Chamber</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SESSION LIVE</span>
                </span>
              </div>

              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center text-white mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    cameraActive ? "block" : "hidden"
                  }`}
                />
                {!cameraActive && (
                  <div className="text-center p-3 text-slate-400">
                    <Camera size={24} className="mx-auto mb-1 opacity-60" />
                    <span className="text-[11px] block">Camera Off</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="btn-secondary text-xs flex-1"
                >
                  {cameraActive ? <Video size={13} /> : <VideoOff size={13} />}
                  <span>{cameraActive ? "Cam On" : "Cam Off"}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleMic}
                  className="btn-secondary text-xs flex-1"
                >
                  {micActive ? <Mic size={13} /> : <MicOff size={13} />}
                  <span>{micActive ? "Mic On" : "Mic Off"}</span>
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Current Prompt Time:</span>
                  <span className="font-mono text-slate-700">
                    {formatTimer(questionSeconds)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Elapsed Time:</span>
                  <span className="font-mono text-slate-700">
                    {formatTimer(sessionSeconds)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
              <strong className="text-slate-800 block mb-1">
                Evaluation Transparency
              </strong>
              Your text responses and timing metadata will be permanently recorded
              in your session history and assessment report upon completion.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
