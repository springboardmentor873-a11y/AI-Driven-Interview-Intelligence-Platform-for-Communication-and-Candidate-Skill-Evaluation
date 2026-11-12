import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileText,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  PlayCircle,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user, defaultDashboardPath } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* 1. Navigation Bar */}
      <nav className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Brand Mark */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              SH
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              SmartHire AI
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How it works
            </a>
            <a href="#assessment" className="hover:text-slate-900 transition-colors">
              Interview assessment
            </a>
            <a href="#candidates" className="hover:text-slate-900 transition-colors">
              Candidates
            </a>
            <a href="#recruiters" className="hover:text-slate-900 transition-colors">
              Recruiters
            </a>
            <a href="#about" className="hover:text-slate-900 transition-colors">
              About
            </a>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <Link
                to={defaultDashboardPath}
                className="btn-primary text-xs h-9 px-4 inline-flex items-center gap-2"
              >
                <span>Go to Workspace</span>
                <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/workspace"
                  className="btn-primary text-xs h-9 px-4 inline-flex items-center gap-2"
                >
                  <span>Start practising</span>
                  <ArrowRight size={13} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-6 py-4 space-y-3 text-xs font-semibold text-slate-700">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-slate-900"
            >
              How it works
            </a>
            <a
              href="#assessment"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-slate-900"
            >
              Interview assessment
            </a>
            <a
              href="#candidates"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-slate-900"
            >
              Candidates
            </a>
            <a
              href="#recruiters"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-slate-900"
            >
              Recruiters
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-slate-900"
            >
              About
            </a>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <Link
                  to={defaultDashboardPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary text-xs justify-center"
                >
                  Go to Workspace
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary text-xs justify-center"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/workspace"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary text-xs justify-center"
                  >
                    Start practising
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* 2. SECTION 1: HERO (Large, Bold, Dominant Display) */}
      <section className="pt-20 pb-20 md:pt-28 md:pb-28 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-4xl">
            {/* Understated Category Label */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span>INTERVIEW PRACTICE & CANDIDATE EVALUATION</span>
            </div>

            {/* Dominant Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold text-slate-950 tracking-tight leading-[1.03] mb-6">
              Make Every <br className="hidden sm:inline" />
              Interview Count.
            </h1>

            {/* Smaller, Secondary Supporting Copy */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed mb-10 font-normal">
              Practise with purpose. Understand your strengths. Walk into your next interview with confidence.
            </p>

            {/* Primary & Secondary Call to Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-12">
              {user ? (
                <Link
                  to={defaultDashboardPath}
                  className="btn-primary h-12 px-7 text-sm font-semibold justify-center inline-flex items-center gap-2"
                >
                  <span>Open your workspace</span>
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/workspace"
                    className="btn-primary h-12 px-7 text-sm font-semibold justify-center inline-flex items-center gap-2 shadow-sm"
                  >
                    <span>Start practising</span>
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    to="/workspace"
                    className="btn-secondary h-12 px-6 text-sm font-semibold justify-center text-slate-700"
                  >
                    <span>Explore for recruiters</span>
                  </Link>
                </>
              )}
            </div>

            {/* Value Statement */}
            <div className="pt-8 border-t border-slate-100 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-slate-900" />
                No artificial score inflation
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-slate-900" />
                Curated interview prompts
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-slate-900" />
                Private, confidential practice
              </span>
            </div>
          </div>

          {/* Authentic Platform Overview Grid (Genuine Capabilities, No Fabricated Transcripts) */}
          <div className="mt-16 pt-12 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                01 &middot; PRACTICE TRACKS
              </span>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Role-Relevant Question Sets
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Practice engineering, leadership, behavioural, and culture alignment questions with configurable question counts and difficulty tiers.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                02 &middot; INTERACTIVE CHAMBERS
              </span>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Realistic Response Environment
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Test audio and video setup, manage question timers, and deliver structured verbal or written answers under realistic pacing.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                03 &middot; STRUCTURED EVALUATION
              </span>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Substantive Communication Feedback
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review specific feedback on answer structure, technical depth, and delivery clarity — without vanity scores or inflated percentages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2: THE PROBLEM (Real Candidate Frustrations) */}
      <section className="py-20 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Narrative */}
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                THE CHALLENGE
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
                Interviews are high stakes. Preparation is often unstructured.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Most candidates struggle not because they lack capability, but because they rarely get the chance to practice speaking under pressure before the actual conversation.
              </p>
              <div className="p-4 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900 block mb-1">
                  Preparation vs. Performance
                </strong>
                Reading guides and memorizing notes is passive. Communicating clearly in front of an interviewer requires structure, timing, and composure.
              </div>
            </div>

            {/* Right: The 4 Concrete Problems */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-xs font-bold font-mono text-slate-400 mb-2">01</div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                  Structuring answers under pressure
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Knowing the material is different from organizing an answer into a coherent explanation within two minutes without rambling.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-xs font-bold font-mono text-slate-400 mb-2">02</div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                  Limited realistic practice
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Practicing in front of a mirror or re-reading notes does not replicate the cadence, timing, or constraints of a real interview.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-xs font-bold font-mono text-slate-400 mb-2">03</div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                  Ambiguous feedback
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Standard rejection emails rarely explain why an answer fell short or how to articulate technical decisions more effectively.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-xs font-bold font-mono text-slate-400 mb-2">04</div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                  Uncertainty about expectations
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Candidates struggle to gauge whether their technical depth and delivery match what hiring teams actually look for in a target role.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION 3: THE SMARTHIRE EXPERIENCE (Workflow) */}
      <section id="how-it-works" className="py-20 border-b border-slate-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              HOW IT WORKS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
              A structured workflow designed for measurable improvement.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              SmartHire AI provides a deliberate practice loop: select your track, respond under realistic conditions, and review actionable feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-t-2 border-slate-900 pt-5">
              <span className="text-xs font-mono font-bold text-slate-900 block mb-2">
                STEP 01
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Choose what to practise
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Select a discipline aligned with your target role: Software Engineering, Behavioural & Leadership, HR & Culture, or Problem Solving. Set question counts and difficulty tiers.
              </p>
              <div className="text-[11px] font-semibold text-slate-500">
                &bull; Curated question tracks
              </div>
            </div>

            <div className="border-t-2 border-slate-900 pt-5">
              <span className="text-xs font-mono font-bold text-slate-900 block mb-2">
                STEP 02
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Answer structured questions
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Step into the mock room. Speak your answers or write them out under realistic timing constraints. Each response is captured verbatim for objective review.
              </p>
              <div className="text-[11px] font-semibold text-slate-500">
                &bull; Timed practice chamber
              </div>
            </div>

            <div className="border-t-2 border-slate-900 pt-5">
              <span className="text-xs font-mono font-bold text-slate-900 block mb-2">
                STEP 03
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Review interview feedback
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Review your answers, see what worked, and understand what to improve before your next interview. Inspect pacing, answer structure, and technical depth.
              </p>
              <div className="text-[11px] font-semibold text-slate-500">
                &bull; Actionable review summaries
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION 4: INTERVIEW ASSESSMENT */}
      <section id="assessment" className="py-20 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              EVALUATION CRITERIA
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
              Feedback grounded in clear communication criteria.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We do not generate arbitrary scores or vanity percentages. Every assessment evaluates concrete communication and technical criteria that interviewers care about.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Answer Structure
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates whether your response follows a logical progression — defining context, outlining decisions and trade-offs, and concluding with concrete results.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Communication Clarity
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Examines conciseness, precision of technical vocabulary, and whether your explanation is direct and free of unnecessary filler.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Technical Relevance
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assesses whether your answer directly addresses the core engineering or domain constraints of the prompt rather than giving generic statements.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Response Duration
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tracks response timing to help you calibrate answer length — avoiding rushed 20-second surface replies and overly long 8-minute monologues.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Actionable Next Steps
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provides concrete suggestions on what specific details, trade-offs, or real-world caveats would elevate your response in an actual hiring panel.
              </p>
            </div>

            <div className="p-6 bg-slate-900 text-white rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  PRACTICE PRINCIPLE
                </span>
                <h3 className="text-sm font-bold mb-2">
                  No artificial vanity scores
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Real hiring decisions depend on structured reasoning and clear communication. Our feedback focuses on substance, not superficial numbers.
                </p>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-4">
                SmartHire Assessment Standard
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 5: FOR CANDIDATES */}
      <section id="candidates" className="py-20 border-b border-slate-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                FOR CANDIDATES
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
                Build interview fluency in a private, focused environment.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Interviewing is a distinct skill from day-to-day work. SmartHire AI gives you a safe space to practice difficult questions, review your transcripts, and build confidence before talking to hiring managers.
              </p>
              <Link
                to="/workspace"
                className="btn-primary text-xs h-10 px-5 inline-flex items-center gap-2"
              >
                <span>Start candidate practice</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="pb-6 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Interview practice
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Practice role-relevant prompts across software engineering, behavioural scenarios, and culture alignment. Control session length and calibrate difficulty to match your target interview stage.
                </p>
              </div>

              <div className="pb-6 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Resume management
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Store and manage your PDF resume. Resumes provide context for tailored practice and allow recruiters in the directory to evaluate your background alongside your interview practice records.
                </p>
              </div>

              <div className="pb-6 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Your practice history
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every completed session is archived with your recorded responses and timestamps. Re-read your previous answers to see how your explanations and conciseness develop over time.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Performance improvement
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Track cumulative practice time and completed questions. Focus on identifying recurring communication patterns and refining your answers between attempts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 6: FOR RECRUITERS */}
      <section id="recruiters" className="py-20 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                FOR RECRUITERS & HIRING TEAMS
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
                Evaluate genuine candidate readiness, not just resume keywords.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Move beyond resumes alone. SmartHire AI gives hiring managers and talent teams verified candidate practice records, answer transcripts, and structured evaluations to make screening more objective.
              </p>
              <div className="space-y-3 mb-8">
                <div className="p-3 bg-white border border-slate-200 rounded text-xs text-slate-600">
                  <strong className="text-slate-900 block mb-0.5">
                    Verified Recruiter Governance
                  </strong>
                  Recruiter workspaces require platform administrative review to protect candidate privacy and ensure verified organizational access.
                </div>
              </div>
              <Link
                to="/workspace"
                className="btn-secondary text-xs h-10 px-5 inline-flex items-center gap-2 text-slate-900 font-semibold"
              >
                <span>Explore recruiter workspace</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-slate-900 font-bold text-sm mb-1.5 flex items-center gap-2">
                  <Search size={15} />
                  <span>Candidate discovery</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Search and filter registered candidates who have completed practice interviews across technical and behavioural tracks.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-slate-900 font-bold text-sm mb-1.5 flex items-center gap-2">
                  <UserCheck size={15} />
                  <span>Candidate profiles</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Inspect candidate registration dates, account status, attached resumes, and number of completed practice sessions.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-slate-900 font-bold text-sm mb-1.5 flex items-center gap-2">
                  <MessageSquare size={15} />
                  <span>Assessment information</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Read candidates' actual responses to standardized engineering questions with captured duration and word count data.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-lg">
                <div className="text-slate-900 font-bold text-sm mb-1.5 flex items-center gap-2">
                  <ShieldCheck size={15} />
                  <span>Evidence-based review</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Base early screening conversations on documented candidate communication and problem-solving rather than subjective impressions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SECTION 7: ABOUT THE PLATFORM */}
      <section id="about" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-6">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2 text-center">
            ABOUT SMARTHIRE AI
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-6 text-center">
            Bridging candidate preparation and hiring evaluation.
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed text-center max-w-2xl mx-auto mb-10">
            An interview practice and candidate evaluation platform for people preparing for their next opportunity and teams assessing talent. We believe that better interviews start with better practice, and that hiring decisions should be grounded in authentic demonstrations of ability.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-slate-200 text-xs">
            <div>
              <strong className="text-slate-900 block mb-1">Authentic Practice</strong>
              <p className="text-slate-500 leading-relaxed">
                Realistic interview questions that reflect actual technical and leadership conversations.
              </p>
            </div>
            <div>
              <strong className="text-slate-900 block mb-1">Objective Criteria</strong>
              <p className="text-slate-500 leading-relaxed">
                Feedback focused on structure, clarity, and relevance rather than vanity scores.
              </p>
            </div>
            <div>
              <strong className="text-slate-900 block mb-1">Role-Governed Privacy</strong>
              <p className="text-slate-500 leading-relaxed">
                Candidate practice records are private and protected with verified recruiter access controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. SECTION 8: FINAL CALL TO ACTION */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Start preparing for your next interview today.
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Choose your workspace to practice questions, review feedback, or evaluate candidate performance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/workspace"
              className="w-full sm:w-auto h-11 px-7 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>Start as Candidate</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/workspace"
              className="w-full sm:w-auto h-11 px-6 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>Continue as Recruiter</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. SECTION 9: FOOTER */}
      <footer className="py-14 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <div className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
                  SH
                </div>
                <span>SmartHire AI</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                An interview practice and candidate evaluation platform for people preparing for their next opportunity and teams assessing talent.
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-3 text-xs">Platform</span>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#assessment" className="hover:text-slate-900 transition-colors">
                    Interview assessment
                  </a>
                </li>
                <li>
                  <Link to="/workspace" className="hover:text-slate-900 transition-colors">
                    Candidate workspace
                  </Link>
                </li>
                <li>
                  <Link to="/workspace" className="hover:text-slate-900 transition-colors">
                    Recruiter console
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-3 text-xs">Practice Tracks</span>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-600">Software Engineering</li>
                <li className="text-slate-600">Behavioural & Leadership</li>
                <li className="text-slate-600">HR & Culture Alignment</li>
                <li className="text-slate-600">Problem Solving & Logic</li>
              </ul>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-3 text-xs">Access</span>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/workspace" className="hover:text-slate-900 transition-colors">
                    Choose workspace
                  </Link>
                </li>
                <li>
                  <Link to="/auth/login" className="hover:text-slate-900 transition-colors">
                    Sign in to account
                  </Link>
                </li>
                <li>
                  <Link to="/auth/register" className="hover:text-slate-900 transition-colors">
                    Create candidate profile
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <span>&copy; {new Date().getFullYear()} SmartHire AI. All rights reserved.</span>
            <span className="text-slate-400">
              Built with disciplined typography and genuine platform data.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
