import { Link } from 'react-router-dom'
import { categoryLabel, difficultyLabel } from '../labels'

// Shown before the interview starts (status: created).
export default function InterviewIntro({ session, busy, error, onBegin }) {
  const facts = [
    ['Type', categoryLabel[session.category]],
    session.domain && ['Subject', session.domain],
    ['Difficulty', difficultyLabel[session.difficulty]],
    ['Questions', session.num_questions],
    ['Time limit', `${session.time_limit_minutes} minutes`],
  ].filter(Boolean)

  return (
    <div className='max-w-3xl space-y-6'>
      <div className='rounded-3xl bg-white/70 p-7'>
        <h2 className='font-display text-2xl font-semibold'>Your interview</h2>
        <dl className='mt-4 grid gap-4 sm:grid-cols-3'>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className='text-xs font-semibold uppercase tracking-wide text-ink/50'>{label}</dt>
              <dd className='mt-0.5 font-semibold'>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className='rounded-3xl bg-sand/70 p-7'>
        <h2 className='font-display text-2xl font-semibold'>Before you begin</h2>
        <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-ink/80'>
          <li>The timer starts when you press Begin and keeps running if you close the page.</li>
          <li>Write your answer, or record your voice, then press Save answer.</li>
          <li>Once an answer is saved it cannot be changed, so check it first.</li>
          <li>The interview finishes by itself when the time is over.</li>
          <li>Voice is optional. The browser asks for the microphone only when you press Record.</li>
        </ul>
      </div>

      {error && <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{error}</p>}

      <div className='flex flex-wrap items-center gap-4'>
        <button onClick={onBegin} disabled={busy} className='btn-primary'>
          {busy ? 'Starting...' : 'Begin interview'}
        </button>
        <Link to='/candidate' className='text-sm font-semibold text-moss underline underline-offset-4'>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
