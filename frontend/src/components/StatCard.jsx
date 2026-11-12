const tones = {
  sand: 'bg-sand text-ink',
  moss: 'bg-moss text-paper',
  saffron: 'bg-saffron text-ink',
  clay: 'bg-clay text-paper',
}

export default function StatCard({ label, value, tone = 'sand', note }) {
  return (
    <div className={`rounded-3xl p-6 ${tones[tone]}`}>
      <p className='text-sm font-medium opacity-80'>{label}</p>
      <p className='mt-3 font-display text-5xl font-semibold leading-none'>{value ?? '-'}</p>
      {note && <p className='mt-3 text-xs opacity-70'>{note}</p>}
    </div>
  )
}