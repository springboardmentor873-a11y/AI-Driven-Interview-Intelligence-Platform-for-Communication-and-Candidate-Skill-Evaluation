export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 py-10 text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-pine" />
      {label}
    </div>
  )
}

export function Alert({ children, kind = 'error' }) {
  if (!children) return null
  const styles = kind === 'error'
    ? 'border-brick/30 bg-red-50 text-brick'
    : 'border-pine/20 bg-pine-soft text-ink'
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

export function Segmented({ value, onChange, options, name }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-line bg-white p-1" role="radiogroup" aria-label={name}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded px-3 py-2 text-sm font-medium transition-colors ${value === v ? 'bg-pine text-white' : 'text-muted hover:text-ink'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
