import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';

export default function InterviewSetup() {
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Setup options
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialResumeId = searchParams.get('resume_id') || '';

  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [customRole, setCustomRole] = useState('');
  const [interviewType, setInterviewType] = useState('technical');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedResumeId, setSelectedResumeId] = useState(initialResumeId);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [timeLimit, setTimeLimit] = useState(120);

  // Hardware check state
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [hardwareError, setHardwareError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const nav = useNavigate();

  const standardRoles = [
    'Full Stack Developer',
    'Frontend Engineer (React)',
    'Backend Engineer (Python/Django)',
    'Software Engineer',
    'Data Scientist / ML Engineer',
    'DevOps / Cloud Engineer',
    'Product Manager',
    'Custom Role',
  ];

  const roundTypes = [
    {
      id: 'technical',
      name: 'Technical Interview',
      desc: 'Architecture, algorithms, debugging, framework internals, system design.',
      icon: '💻',
      color: 'blue',
    },
    {
      id: 'hr',
      name: 'HR & Cultural Fit',
      desc: 'Motivation, career path, culture alignment, teamwork, professionalism.',
      icon: '🤝',
      color: 'emerald',
    },
    {
      id: 'behavioral',
      name: 'Behavioral Round',
      desc: 'STAR method, conflict resolution, leadership, resilience under pressure.',
      icon: '🧠',
      color: 'purple',
    },
    {
      id: 'aptitude',
      name: 'Aptitude & Reasoning',
      desc: 'Problem solving estimation, analytical logic, system deduction.',
      icon: '📈',
      color: 'amber',
    },
    {
      id: 'mixed',
      name: 'Comprehensive (Mixed)',
      desc: 'Balanced combination of technical depth and behavioral scenarios.',
      icon: '⚡',
      color: 'indigo',
    },
  ];

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const userRes = await api.get('/auth/me/');
        if (userRes.data.role !== 'candidate') {
          nav('/dashboard');
          return;
        }
        setUser(userRes.data);

        // Fetch candidate resumes
        const resRes = await api.get('/resumes/');
        setResumes(resRes.data);

        if (!selectedResumeId && resRes.data.length > 0) {
          setSelectedResumeId(resRes.data[0].id);
        }
      } catch (err) {
        nav('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchInit();

    return () => {
      stopCamera();
    };
  }, [nav]);

  const startCamera = async () => {
    setHardwareError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMicActive(true);
    } catch (err) {
      setHardwareError('Camera or Microphone access denied. Please allow permissions in your browser.');
      setCameraActive(false);
      setMicActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setMicActive(false);
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const effectiveRole = targetRole === 'Custom Role' ? customRole.trim() : targetRole;
    if (!effectiveRole) {
      setError('Please provide a target role for the interview.');
      setCreating(false);
      return;
    }

    try {
      const payload = {
        target_role: effectiveRole,
        interview_type: interviewType,
        difficulty: difficulty,
        total_questions: Number(totalQuestions),
        time_limit_per_question: Number(timeLimit),
        resume_id: selectedResumeId ? Number(selectedResumeId) : null,
      };

      const { data } = await api.post('/interviews/sessions/', payload);
      stopCamera();
      nav(`/interview/room/${data.id}`);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to generate interview session. Please check your Groq API configuration and try again.'
      );
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 font-medium">Preparing interview engine...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
            AI Interview Engine (Milestone 2)
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Configure Your Mock Interview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Powered by Groq LPU inference. Questions are dynamically generated and tailored to your resume, domain, and difficulty level.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLaunch} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Target Domain / Role */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                Target Job Role & Domain
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {standardRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setTargetRole(role)}
                    className={`p-3 text-xs font-semibold rounded-xl border text-center transition ${
                      targetRole === role
                        ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {targetRole === 'Custom Role' && (
                <div>
                  <input
                    type="text"
                    placeholder="Enter custom role title (e.g. Cloud Security Architect)"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </div>

            {/* Interview Round Type */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                Interview Round Type
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roundTypes.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setInterviewType(t.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      interviewType === t.id
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{t.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty & Parameters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                Difficulty & Session Parameters
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="easy">Easy (Fundamentals / Entry)</option>
                    <option value="medium">Medium (Mid-Level / Core)</option>
                    <option value="hard">Hard (Senior / Edge Cases)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Number of Questions
                  </label>
                  <select
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="3">3 Questions (Quick Test)</option>
                    <option value="5">5 Questions (Standard)</option>
                    <option value="10">10 Questions (Comprehensive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Time Limit per Question
                  </label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="90">90 Seconds</option>
                    <option value="120">2 Minutes (Default)</option>
                    <option value="180">3 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Resume Selection */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link Resume for Personalized Questions (Optional)
                </label>
                {resumes.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No uploaded resumes found. The AI will generate industry-standard questions for the chosen role.
                  </p>
                ) : (
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Do not attach resume (generic questions)</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.file_name || `Resume #${r.id}`} ({r.parsing_status === 'completed' ? 'AI Parsed' : 'Uploaded'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Hardware Pre-Check & Launch Card (1 Col) */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
                <span>Hardware Pre-Check</span>
                <span className="text-xs text-slate-400">Webcam & Mic</span>
              </h2>

              <p className="text-xs text-slate-500">
                Ensure your camera and microphone are operational before starting.
              </p>

              {hardwareError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {hardwareError}
                </div>
              )}

              {/* Camera Preview Box */}
              <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && (
                  <div className="text-center p-4">
                    <span className="text-3xl">📷</span>
                    <p className="text-xs text-slate-400 mt-2">Camera is inactive</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                  >
                    Test Camera & Mic
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full py-2 px-3 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition"
                  >
                    Turn Off Preview
                  </button>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-between text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span>✓ Camera active</span>
                  <span>✓ Mic active</span>
                </div>
              )}
            </div>

            {/* Launch Action */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/20 space-y-4">
              <h3 className="text-lg font-bold">Ready to Start?</h3>
              <p className="text-xs text-blue-100 leading-relaxed">
                Clicking launch will activate the Groq AI question generation engine and transfer you into the interactive interview room.
              </p>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 px-4 bg-white text-blue-700 rounded-xl text-sm font-bold shadow hover:bg-blue-50 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating with Groq...
                  </>
                ) : (
                  'Launch Interview Room →'
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
