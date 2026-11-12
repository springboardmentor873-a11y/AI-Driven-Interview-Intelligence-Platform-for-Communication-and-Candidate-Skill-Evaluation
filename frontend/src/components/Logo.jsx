export default function Logo({ size = 38, light = false }) {
  const text = light ? '#f6f1e9' : '#17261f'
  return (
    <div className='flex items-center gap-2.5'>
      <svg width={size} height={size} viewBox='0 0 48 48' fill='none' aria-hidden='true'>
        <rect width='48' height='48' rx='14' fill='#1f4d3f' />
        <path
          d='M12 15a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H23l-7 6v-6a4 4 0 0 1-4-4z'
          fill='#e9a23b'
        />
        <path d='M18 20.5l4 4 8-9' stroke='#1f4d3f' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
      <div className='flex items-center'>
        <span className='font-display text-xl font-semibold tracking-tight' style={{ color: text }}>
          SmartHire
        </span>
        <span className='ml-1.5 rounded-md bg-saffron px-1.5 py-0.5 text-[11px] font-bold text-ink'>AI</span>
      </div>
    </div>
  )
}