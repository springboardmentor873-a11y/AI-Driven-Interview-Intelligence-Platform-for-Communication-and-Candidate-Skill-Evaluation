import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import ActionCard from "../components/dashboard/ActionCard";
import Panel from "../components/dashboard/Panel";
import StatCard from "../components/dashboard/StatCard";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

const TYPES = { hr: "HR", technical: "Technical", behavioral: "Behavioral", aptitude: "Aptitude" };
const LEVELS = { easy: "Easy", medium: "Medium", hard: "Hard" };
const STATUS = {
  scheduled: { label: "Not started", style: "bg-white/10 text-white/70" },
  in_progress: { label: "In progress", style: "bg-amber-500/15 text-amber-300" },
  completed: { label: "Completed", style: "bg-emerald-500/15 text-emerald-300" },
  cancelled: { label: "Cancelled", style: "bg-red-500/10 text-red-300" },
};
const SUBTITLES = {
  recruiter: "Create interview templates and see how candidates are using them.",
  admin: "Keep an eye on who is using the platform.",
};

const ENDPOINTS = {
  candidate: { resumes: "/api/resumes/", sessions: "/api/interviews/sessions/" },
  recruiter: { templates: "/api/interviews/templates/" },
  admin: { users: "/api/auth/users/" },
};

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

/** Loads what this role's dashboard needs. A failed request gives null, shown as a dash. */
function useDashboardData(role) {
  const [state, setState] = useState({ loading: true, data: {} });
  useEffect(() => {
    let alive = true;
    const requests = Object.entries(ENDPOINTS[role] || {}).map(([key, url]) =>
      client.get(url).then((res) => [key, res.data]).catch(() => [key, null]),
    );
    Promise.all(requests).then((results) => {
      if (alive) setState({ loading: false, data: Object.fromEntries(results) });
    });
    return () => {
      alive = false;
    };
  }, [role]);
  return state;
}

const count = (list, test = () => true) => (list ? list.filter(test).length : "—");
const sum = (list, pick) => (list ? list.reduce((total, item) => total + pick(item), 0) : "—");

function Hero({ role, greet, name, subtitle, children }) {
  return (
    <section className="relative animate-fade-up overflow-hidden rounded-4xl border border-white/10 bg-hero-glow px-8 py-10 sm:px-12 sm:py-12">
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 animate-float rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 animate-float rounded-full bg-pink-500/20 blur-3xl [animation-delay:-5s]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold capitalize text-brand-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {role} dashboard
        </span>
        <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
          {greet}, <span className="bg-text-accent bg-clip-text text-transparent">{name}</span>
        </h1>
        <p className="mt-3 max-w-xl text-white/60">{subtitle}</p>
        <div className="mt-7 flex flex-wrap gap-3">{children}</div>
      </div>
    </section>
  );
}

function Empty({ icon, title, note, to, cta }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/40">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-white/50">{note}</p>
      <Link to={to} className="mt-5 inline-block">
        <Button variant="solid" className="!px-5 !py-2 text-sm">{cta}</Button>
      </Link>
    </div>
  );
}

function InterviewRow({ session }) {
  const status = STATUS[session.status];
  const percent = session.question_total ? Math.round((session.answered_count / session.question_total) * 100) : 0;
  return (
    <Link
      to={`/interview/${session.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:border-brand-500/40 hover:bg-white/[0.06]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
        <Icon name="video" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{session.template_title || `${TYPES[session.interview_type]} interview`}</p>
        <p className="mt-0.5 truncate text-xs text-white/50">
          {[TYPES[session.interview_type], LEVELS[session.difficulty], session.domain].filter(Boolean).join(" · ")} ·{" "}
          {new Date(session.created_at).toLocaleDateString()}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-btn-brand" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${status.style}`}>{status.label}</span>
      <Icon name="arrow" className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-brand-400" />
    </Link>
  );
}

function Checklist({ steps }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <Panel title="Get started" delay={80}>
      <div className="flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-btn-brand transition-all duration-700" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-white/60">{done} of {steps.length}</span>
      </div>
      <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.label}>
            <Link
              to={step.to}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                step.done ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 hover:border-brand-500/50"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  step.done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                }`}
              >
                {step.done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`text-sm font-medium ${step.done ? "text-white/50 line-through" : ""}`}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function CandidateView({ data, loading }) {
  const { resumes, sessions } = data;
  const completed = count(sessions, (s) => s.status === "completed");
  const primary = (resumes || []).find((r) => r.is_primary) || (resumes || [])[0];
  const skills = primary ? [...(primary.technologies || []), ...(primary.skills || [])].slice(0, 10) : [];
  const steps = [
    { label: "Upload your resume", to: "/resumes", done: Boolean(resumes?.length) },
    { label: "Start your first interview", to: "/interview", done: Boolean(sessions?.length) },
    { label: "Finish an interview", to: "/interview", done: completed > 0 },
  ];

  return (
    <>
      {!loading && !steps.every((s) => s.done) && <Checklist steps={steps} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="document" label="Resumes" value={count(resumes)} tone="violet" delay={100} loading={loading} />
        <StatCard icon="check" label="Interviews completed" value={completed} tone="green" delay={160} loading={loading} />
        <StatCard icon="mic" label="Questions answered" value={sum(sessions, (s) => s.answered_count)} tone="pink" delay={220} loading={loading} />
        <StatCard icon="clock" label="Waiting to finish" value={count(sessions, (s) => s.status === "scheduled" || s.status === "in_progress")} tone="amber" delay={280} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard icon="document" title="My resumes" note="Upload a resume and see the skills we find" to="/resumes" delay={120} />
        <ActionCard icon="video" title="Start a mock interview" note="Practice with your camera and microphone" to="/interview" delay={180} />
        <ActionCard icon="chart" title="Performance analytics" note="Scores and progress over time" delay={240} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Panel title="Recent interviews" linkTo="/interview" linkLabel="See all" className="lg:col-span-3" delay={160}>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />)}</div>
          ) : sessions?.length ? (
            <div className="space-y-3">{sessions.slice(0, 4).map((s) => <InterviewRow key={s.id} session={s} />)}</div>
          ) : (
            <Empty icon="video" title="No interviews yet" note="Your practice interviews will show up here." to="/interview" cta="Start your first interview" />
          )}
        </Panel>

        <Panel title="Your resume" linkTo="/resumes" linkLabel="Manage" className="lg:col-span-2" delay={220}>
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
          ) : primary ? (
            <>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                  <Icon name="document" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{primary.original_name}</p>
                  <p className="text-xs text-white/50">
                    {primary.parse_source === "ai" ? "Analysed by AI" : primary.parse_source === "basic" ? "Basic scan" : "Not analysed yet"}
                  </p>
                </div>
              </div>
              {primary.summary && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/60">{primary.summary}</p>}
              {skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">{skill}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Empty icon="document" title="No resume yet" note="Upload one to get questions about your own skills." to="/resumes" cta="Upload a resume" />
          )}
        </Panel>
      </div>
    </>
  );
}

function RecruiterView({ data, loading }) {
  const { templates } = data;
  const published = count(templates, (t) => t.is_published);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="template" label="Templates" value={count(templates)} tone="violet" delay={100} loading={loading} />
        <StatCard icon="check" label="Published" value={published} tone="green" delay={160} loading={loading} />
        <StatCard icon="clock" label="Drafts" value={templates ? templates.length - published : "—"} tone="amber" delay={220} loading={loading} />
        <StatCard icon="users" label="Interviews taken" value={sum(templates, (t) => t.session_count)} tone="pink" delay={280} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard icon="template" title="Interview templates" note="Create and manage interviews" to="/templates" delay={120} />
        <ActionCard icon="users" title="Candidate reports" note="Scores and feedback per candidate" delay={180} />
        <ActionCard icon="chart" title="Compare candidates" note="Side-by-side comparison" delay={240} />
      </div>

      <Panel title="Your templates" linkTo="/templates" linkLabel="Manage" delay={160}>
        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />)}</div>
        ) : templates?.length ? (
          <div className="space-y-3">
            {templates.slice(0, 5).map((t) => (
              <Link key={t.id} to="/templates" className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:border-brand-500/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                  <Icon name="template" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.title}</p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {[TYPES[t.interview_type], LEVELS[t.difficulty], t.domain].filter(Boolean).join(" · ")} · {t.question_count} questions · used {t.session_count}×
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"}`}>
                  {t.is_published ? "Published" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty icon="template" title="No templates yet" note="Create one and candidates can start interviews from it." to="/templates" cta="Create a template" />
        )}
      </Panel>
    </>
  );
}

function AdminView({ data, loading }) {
  const { users } = data;
  const roles = [
    { key: "candidate", label: "Candidates", bar: "bg-violet-500" },
    { key: "recruiter", label: "Recruiters", bar: "bg-pink-500" },
    { key: "admin", label: "Admins", bar: "bg-amber-400" },
  ];
  const total = users?.length || 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="users" label="Total users" value={count(users)} tone="violet" delay={100} loading={loading} />
        {roles.map((r, i) => (
          <StatCard key={r.key} icon={r.key === "admin" ? "shield" : "users"} label={r.label} value={count(users, (u) => u.role === r.key)} tone={["green", "pink", "amber"][i]} delay={160 + i * 60} loading={loading} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard icon="users" title="Manage users" note="See everyone on the platform" to="/admin/users" delay={120} />
        <ActionCard icon="shield" title="Platform settings" note="Configuration and access" delay={180} />
        <ActionCard icon="chart" title="Platform-wide analytics" note="Usage across all interviews" delay={240} />
      </div>

      <Panel title="Users by role" linkTo="/admin/users" linkLabel="Manage users" delay={160}>
        {loading || !total ? (
          <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ) : (
          <div className="space-y-4">
            {roles.map((r) => {
              const n = users.filter((u) => u.role === r.key).length;
              return (
                <div key={r.key}>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">{r.label}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${r.bar} transition-all duration-700`} style={{ width: `${(n / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { loading, data } = useDashboardData(user.role);
  const [greet] = useState(greeting);
  const name = user.first_name || user.email;

  const open =
    user.role === "candidate"
      ? (data.sessions || []).find((s) => s.status === "in_progress") || (data.sessions || []).find((s) => s.status === "scheduled")
      : null;
  const subtitle =
    user.role === "candidate"
      ? data.resumes?.length
        ? "Pick up where you left off, or start a fresh practice interview."
        : "Upload your resume to get interview questions built around your own skills."
      : SUBTITLES[user.role];

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      <Navbar />
      <main className="relative mx-auto max-w-6xl space-y-8 px-6 py-10">
        <Hero role={user.role} greet={greet} name={name} subtitle={subtitle}>
          {user.role === "candidate" && (
            <>
              {open && (
                <Link to={`/interview/${open.id}`}>
                  <Button variant="solid" className="shadow-glow">
                    {open.status === "in_progress" ? "Continue your interview" : "Begin your interview"} →
                  </Button>
                </Link>
              )}
              <Link to="/interview">
                <Button variant={open ? "ghost" : "solid"} className={open ? "border border-white/20 bg-white/5 hover:bg-white/10" : "shadow-glow"}>
                  Start a mock interview
                </Button>
              </Link>
            </>
          )}
          {user.role === "recruiter" && (
            <Link to="/templates">
              <Button variant="solid" className="shadow-glow">Create a template</Button>
            </Link>
          )}
          {user.role === "admin" && (
            <Link to="/admin/users">
              <Button variant="solid" className="shadow-glow">Manage users</Button>
            </Link>
          )}
        </Hero>

        {user.role === "candidate" && <CandidateView data={data} loading={loading} />}
        {user.role === "recruiter" && <RecruiterView data={data} loading={loading} />}
        {user.role === "admin" && <AdminView data={data} loading={loading} />}
      </main>
    </div>
  );
}
