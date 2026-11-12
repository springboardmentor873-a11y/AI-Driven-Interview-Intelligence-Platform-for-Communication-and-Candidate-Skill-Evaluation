import { Link } from "react-router-dom";
import {
  ArrowRight,
  PlayCircle,
  FileText,
  CheckCircle2,
  Users,
  Award,
  Clock,
  Sparkles,
  BarChart3,
  Search,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  Check,
  Video,
  Mic,
} from "lucide-react";
import { Badge } from "../components/UI";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user, defaultDashboardPath } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* 1. Professional Navigation Bar */}
      <nav className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              SH
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              SmartHire AI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#candidates" className="hover:text-slate-900 transition-colors">
              For Candidates
            </a>
            <a href="#recruiters" className="hover:text-slate-900 transition-colors">
              For Recruiters
            </a>
            <a href="#why-smarthire" className="hover:text-slate-900 transition-colors">
              Why SmartHire
            </a>
            <a href="#about" className="hover:text-slate-900 transition-colors">
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to={defaultDashboardPath} className="btn-primary text-xs">
                <span>Go to Workspace</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/workspace" className="btn-quiet text-xs font-semibold">
                  Sign In
                </Link>
                <Link to="/workspace" className="btn-primary text-xs">
                  <span>Get Started</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>AI-Powered Mock Interviews & Candidate Assessment</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12] mb-6">
          Prepare Smarter. Interview Better. <br className="hidden sm:inline" />
          <span className="text-indigo-600">Get Hired.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
          SmartHire AI helps you practise real-world interviews, understand your strengths, improve your communication, and build confidence through personalised AI-powered feedback.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-16">
          {user ? (
            <Link to={defaultDashboardPath} className="btn-primary w-full sm:w-auto h-11 px-7 text-sm">
              <span>Open Your Workspace</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/workspace" className="btn-brand w-full sm:w-auto h-11 px-7 text-sm justify-center">
                <span>Start Free Practice</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="btn-secondary w-full sm:w-auto h-11 px-6 text-sm justify-center">
                <span>Explore How It Works</span>
              </a>
            </>
          )}
        </div>

        {/* 3. Authentic Product Preview */}
        <div className="border border-slate-200/90 rounded-2xl bg-slate-50/60 p-3 sm:p-5 shadow-elevated text-left">
          {/* Mock Browser Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 px-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="ml-2 text-xs font-semibold text-slate-600">
                SmartHire AI &bull; Interactive Interview Chamber
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Session Active
              </span>
            </div>
          </div>

          {/* Chamber Content Simulation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Cols: Question & Active Candidate Practice */}
            <div className="lg:col-span-2 p-6 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="blue">Technical Engineering</Badge>
                    <span className="text-slate-400">&bull;</span>
                    <span className="font-medium text-slate-600">Question 2 of 4</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono font-medium text-slate-700">
                    <Clock size={13} className="text-slate-400" />
                    <span>02:34 elapsed</span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-4">
                  "Explain how you design a resilient caching strategy with Redis or Memcached to prevent cache stampedes and stale data."
                </h3>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2 mb-4 font-normal">
                  <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    Candidate Response (Transcribed in real-time)
                  </p>
                  <p>
                    "I approach caching in three layers: first, establishing deterministic TTLs with probabilistic early expiration (XFetch algorithm) to prevent simultaneous background cache misses. Second, wrapping read-through queries with distributed mutex locks so only one worker recomputes expensive aggregations while others await the cached value..."
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-3 text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <Mic size={14} /> Mic Active
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Video size={14} /> Video Ready
                  </span>
                  <span className="font-mono text-slate-600">82 words captured</span>
                </div>
                <span className="text-indigo-600 font-semibold flex items-center gap-1">
                  Next Question <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* Right Col: Instant Feedback & Evaluation Rubric */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Instant AI Evaluation
                  </h4>
                </div>

                <div className="space-y-3.5 mb-6">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Conceptual Depth</span>
                      <span className="font-bold text-slate-900">88%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full w-[88%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Clarity & Pacing</span>
                      <span className="font-bold text-slate-900">92%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full w-[92%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Structure & Framing</span>
                      <span className="font-bold text-slate-900">84%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full w-[84%]" />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-950">
                  <span className="font-bold block mb-1">Feedback Highlight:</span>
                  <p className="text-[11px] text-indigo-900/90 leading-relaxed">
                    Clear breakdown of cache stampede prevention. To make this answer even stronger, briefly mention fallback strategies when the caching tier is temporarily unreachable.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                Evaluation generated automatically upon response submission.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="eyebrow block mb-2">SIMPLE THREE-STEP WORKFLOW</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
              How SmartHire AI prepares you for success
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Practising for interviews should be structured, realistic, and productive. Follow three straightforward steps to improve your performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="panel p-6 bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center mb-4 text-sm border border-indigo-100">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Select Your Interview Track
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Choose from Technical Engineering, Behavioural & Leadership, HR & Culture, or Problem Solving based on your target role and seniority.
                </p>
              </div>
              <div className="text-xs font-semibold text-indigo-600">
                Over 50+ curated interview prompts &rarr;
              </div>
            </div>

            <div className="panel p-6 bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 font-bold flex items-center justify-center mb-4 text-sm border border-purple-100">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Practice Timed Responses
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Step into the interactive interview chamber. Speak your answers or type them out under realistic timing constraints to simulate high-stakes conversations.
                </p>
              </div>
              <div className="text-xs font-semibold text-purple-600">
                Live pacing & response capture &rarr;
              </div>
            </div>

            <div className="panel p-6 bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center mb-4 text-sm border border-emerald-100">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Review Actionable Feedback
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Receive personalized evaluations that break down your answer structure, key strengths, vocabulary, and specific areas where you can sharpen your delivery.
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-600">
                Exportable performance summaries &rarr;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Candidate Features */}
      <section id="candidates" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <span className="eyebrow block mb-2">CANDIDATE WORKSPACE</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
                Everything you need to interview with confidence.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Most candidates struggle because they rarely hear themselves communicate under pressure. SmartHire AI gives you a safe, private space to build fluency, structure articulate answers, and track your improvement across sessions.
              </p>

              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0 border border-emerald-200">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span><strong>Comprehensive Track Variety:</strong> Practice system design, coding logic, leadership scenarios, and culture-fit prompts.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0 border border-emerald-200">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span><strong>Resume Integration:</strong> Upload your PDF resume so interview assessments can highlight skill alignments and relevant career milestones.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0 border border-emerald-200">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span><strong>Interview History Archive:</strong> Review all past practice sessions, reread your responses, and see how your delivery evolves.</span>
                </div>
              </div>

              <div className="mt-8">
                <Link to="/workspace" className="btn-brand text-xs">
                  <span>Enter Candidate Workspace</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Candidate Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <PlayCircle size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">Mock Interview Chambers</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Interactive practice sessions with configurable question counts and difficulty tiers.
                </p>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                  <FileText size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">Resume & Skill Profiles</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Store and manage your resume documents to target specific domains and career tracks.
                </p>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Award size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">Detailed Assessment Reports</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  In-depth evaluation summaries with delivery metrics, timing analysis, and feedback.
                </p>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">Growth & Consistency Metrics</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Track cumulative practice time, total completed prompts, and session history over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Recruiter Features */}
      <section id="recruiters" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Recruiter Capabilities Box */}
            <div className="order-2 lg:order-1 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Recruiter Console Preview</span>
                <Badge variant="purple">Talent Acquisition</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Candidate Discovery Directory</span>
                    <span className="text-slate-500">Filter registered candidates by track, status, and activity</span>
                  </div>
                  <Search size={16} className="text-slate-400" />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Assessment Transcripts</span>
                    <span className="text-slate-500">Review candidate answer depth and communication pacing</span>
                  </div>
                  <FileText size={16} className="text-slate-400" />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Resume Verification</span>
                    <span className="text-slate-500">Inspect submitted resumes alongside interview performance</span>
                  </div>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
                Recruiter workspaces are verified through an organizational review process to maintain candidate privacy and data protection standards.
              </div>
            </div>

            {/* Recruiter Text Content */}
            <div className="order-1 lg:order-2">
              <span className="eyebrow block mb-2">RECRUITER WORKSPACE</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
                Discover talent through structured, authentic evaluation.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Move beyond resumes alone. SmartHire AI allows talent acquisition teams and engineering managers to evaluate genuine candidate problem-solving, communication clarity, and situational maturity.
              </p>

              <div className="space-y-3 text-xs text-slate-700 mb-8">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-600 shrink-0" />
                  <span>Review recorded responses to standardized technical and behavioural prompts.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-600 shrink-0" />
                  <span>Inspect candidate resumes alongside actual practice session records.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-600 shrink-0" />
                  <span>Reduce screening bias with consistent, question-by-question evaluation rubrics.</span>
                </div>
              </div>

              <Link to="/auth/recruiter" className="btn-primary text-xs">
                <span>Request Recruiter Access</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Why SmartHire AI Section */}
      <section id="why-smarthire" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="eyebrow block mb-2">PRODUCT ADVANTAGE</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
              Why SmartHire AI works
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Designed from the ground up for authentic skill evaluation, not memorization or canned templates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="panel p-6 bg-slate-50/50 border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 border border-indigo-100">
                <MessageSquare size={18} />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">Real Questions from Real Interviews</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every prompt in our library reflects the actual technical architecture, behavioural trade-offs, and culture-fit discussions held at modern tech companies.
              </p>
            </div>

            <div className="panel p-6 bg-slate-50/50 border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 border border-purple-100">
                <Award size={18} />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">Actionable Delivery Rubrics</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Feedback focuses on concrete dimensions: response structure, pacing, conciseness, technical depth, and specific guidance on what to improve.
              </p>
            </div>

            <div className="panel p-6 bg-slate-50/50 border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 border border-emerald-100">
                <ShieldCheck size={18} />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">Private & Genuine Records</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your practice data is confidential. We do not populate artificial ratings or fake histories — every number reflects your actual practice sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. About Section */}
      <section id="about" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="eyebrow block mb-2">ABOUT THE PLATFORM</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
            Bridging candidate preparation and hiring evaluation.
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
            SmartHire AI was built to solve a simple problem: traditional interview preparation is passive, while hiring evaluations are frequently unstructured. By providing interactive practice chambers for candidates and structured assessment insights for recruiters, we make the hiring conversation more objective and productive for both sides.
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 pt-4 border-t border-slate-200">
            <span>&bull; Candidate-Centric Practice</span>
            <span>&bull; Verified Recruiter Directory</span>
            <span>&bull; Real Assessment Transcripts</span>
            <span>&bull; Role-Governed Access</span>
          </div>
        </div>
      </section>

      {/* 9. Final Call to Action */}
      <section className="py-16 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Ready to sharpen your interview performance?
          </h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xl mx-auto">
            Choose your workspace to begin practicing mock interviews or discover candidates today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/workspace" className="btn-brand h-11 px-7 text-sm w-full sm:w-auto justify-center">
              <span>Choose Your Workspace</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Professional Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <div className="h-6 w-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs">
              SH
            </div>
            <span>SmartHire AI</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#candidates" className="hover:text-slate-900 transition-colors">
              Candidates
            </a>
            <a href="#recruiters" className="hover:text-slate-900 transition-colors">
              Recruiters
            </a>
            <Link to="/workspace" className="hover:text-slate-900 transition-colors">
              Workspaces
            </Link>
          </div>

          <span>&copy; {new Date().getFullYear()} SmartHire AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
