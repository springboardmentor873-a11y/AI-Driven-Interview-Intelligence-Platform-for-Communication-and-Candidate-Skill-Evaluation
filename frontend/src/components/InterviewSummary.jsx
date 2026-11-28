import { Link } from 'react-router-dom'
import StatCard from './StatCard'

const formatDuration = (seconds) => {
  if (seconds == null) return ''
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`
}

function AnswerStatus({ q }) {
  if (q.answered) {
    return (
      <>
        {q.answer_text && <p className='mt-3 whitespace-pre-wrap rounded-xl bg-sand/60 p-3 text-sm'>{q.answer_text}</p>}
        <p className='mt-2 text-xs font-semibold text-moss'>
          Answered{q.answer_duration_seconds != null && ` in ${formatDuration(q.answer_duration_seconds)}`}
          {q.has_audio && ' · voice recording saved'}
        </p>
      </>
    )
  }
  if (q.status === 'skipped') return <p className='mt-3 text-sm text-ink/55'>Skipped.</p>
  if (q.status === 'expired') return <p className='mt-3 text-sm text-ink/55'>Time ran out before this was answered.</p>
  return <p className='mt-3 text-sm text-ink/55'>Not answered.</p>
}

// Shown after the interview (completed, or any later status).
export default function InterviewSummary({ session }) {
  const answered = session.questions.filter((q) => q.answered).length

  return (
    <div className='space-y-8'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard label='Questions answered' value={`${answered} / ${session.questions.length}`} tone='moss' />
        <StatCard label='Planned length' value={`${session.time_limit_minutes} min`} tone='sand' />
        <StatCard
          label='Questions from'
          value={session.question_source === 'ai' ? 'AI' : 'Bank'}
          tone='saffron'
          note={session.question_source === 'ai' ? 'Written by the AI model' : 'Curated question bank'}
        />
      </div>

      <div className='rounded-3xl bg-ink p-7 text-paper'>
        <span className='rounded-full bg-saffron px-3 py-1 text-xs font-bold text-ink'>Coming next</span>
        <p className='mt-3 text-paper/80'>
          Scoring and detailed feedback for your answers arrive in the next milestone. Your answers are saved safely.
        </p>
      </div>

      <section>
        <h2 className='mb-3 font-display text-2xl font-semibold'>Your answers</h2>
        <ol className='space-y-3'>
          {session.questions.map((q) => (
            <li key={q.id} className='rounded-2xl bg-white/70 p-5'>
              <p className='text-xs font-semibold uppercase tracking-wide text-ink/50'>Question {q.order_no}</p>
              <p className='mt-1 font-semibold'>{q.question_text}</p>
              <AnswerStatus q={q} />
            </li>
          ))}
        </ol>
      </section>

      <Link to='/candidate' className='btn-primary'>
        Back to dashboard
      </Link>
    </div>
  )
}
