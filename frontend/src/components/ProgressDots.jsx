// One dot per question: moss = answered, clay = skipped or expired, saffron ring = current,
// sand = still to come. Not clickable - the interview only moves forward.
export default function ProgressDots({ questions, currentId }) {
  const toneFor = (q) => {
    if (q.status === 'answered') return 'bg-moss'
    if (q.status === 'skipped' || q.status === 'expired') return 'bg-clay/60'
    return 'bg-sand'
  }

  return (
    <div className='flex flex-wrap gap-2' aria-label='Question progress'>
      {questions.map((q) => (
        <span
          key={q.id}
          aria-label={`Question ${q.order_no}: ${q.id === currentId ? 'current' : q.status}`}
          className={`h-3 w-3 rounded-full ${toneFor(q)} ${
            q.id === currentId ? 'ring-2 ring-saffron ring-offset-2 ring-offset-paper' : ''
          }`}
        />
      ))}
    </div>
  )
}
