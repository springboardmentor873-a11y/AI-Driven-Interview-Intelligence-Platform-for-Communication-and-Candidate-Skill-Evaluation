import Navbar from "./Navbar";

export default function AuthLayout({ eyebrow, title, subtitle, bullets = [], children }) {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid items-center gap-10 rounded-4xl bg-hero-glow px-6 py-12 sm:px-12 lg:grid-cols-2">
          <div>
            {eyebrow && <p className="mb-4 text-sm font-semibold text-brand-400">{eyebrow}</p>}
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-5 max-w-md text-lg text-white/60">{subtitle}</p>}
            <ul className="mt-8 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500/25 text-brand-400">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-6 text-gray-900 shadow-2xl sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}