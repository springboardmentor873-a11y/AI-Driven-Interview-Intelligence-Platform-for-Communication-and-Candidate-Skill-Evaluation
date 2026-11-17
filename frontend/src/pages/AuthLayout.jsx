export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex flex-col justify-between bg-ink text-white p-12">
        <span className="text-xl font-semibold">SmartHire AI</span>
        <div>
          <h2 className="text-4xl font-semibold leading-tight max-w-md">
            Practice the interview before it counts.
          </h2>
          <p className="mt-4 text-slate-300 max-w-sm">
            Mock interviews with speech, confidence and answer feedback after every session.
          </p>
        </div>
        <span className="text-sm text-slate-400">Technical · HR · Behavioral · Aptitude</span>
      </aside>
      <main className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-slate-500 mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
export const btnCls =
  "w-full rounded-lg bg-accent text-white py-2 font-medium hover:bg-accent-dark disabled:opacity-60";
