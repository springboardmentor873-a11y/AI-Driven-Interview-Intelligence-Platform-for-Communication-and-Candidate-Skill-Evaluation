import Logo from './Logo'

const points = [
  'Questions shaped around your resume',
  'Feedback on how you speak, not just what you say',
  'Progress you can actually see',
]

export default function AuthLayout({ heading, sub, children }) {
  return (
    <div className='grid min-h-screen bg-paper font-sans text-ink lg:grid-cols-2'>
      <aside className='relative hidden overflow-hidden bg-moss p-12 text-paper lg:flex lg:flex-col lg:justify-between'>
        <Logo light />

        <div className='relative z-10'>
          <h2 className='font-display text-5xl font-semibold leading-tight'>
            Practice the interview <span className='italic text-saffron'>before</span> it counts.
          </h2>
          <p className='mt-5 max-w-md text-lg text-paper/75'>
            Rehearse real questions, get honest feedback, and walk in ready.
          </p>
          <ul className='mt-8 space-y-3 text-paper/90'>
            {points.map((t) => (
              <li key={t} className='flex items-start gap-3'>
                <span className='mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-saffron text-xs font-bold text-ink'>
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className='pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-saffron/20' />
        <div className='pointer-events-none absolute -right-10 top-24 h-40 w-40 rounded-full border-2 border-saffron/30' />
        <p className='relative z-10 text-sm text-paper/50'>SmartHire AI - interview practice platform</p>
      </aside>

      <section className='flex items-center justify-center px-6 py-12'>
        <div className='w-full max-w-md'>
          <div className='mb-8 lg:hidden'>
            <Logo />
          </div>
          <h1 className='font-display text-4xl font-semibold'>{heading}</h1>
          <p className='mt-2 text-ink/65'>{sub}</p>
          <div className='mt-8'>{children}</div>
        </div>
      </section>
    </div>
  )
}