export function Bar({ value, max, label, variant, thin }: { value: number; max: number; label?: string; variant?: 'gold' | 'hp'; thin?: boolean }) {
  const pct = max > 0 ? Math.min(100, (100 * value) / max) : 0
  return (
    <div className={`bar ${variant ?? ''} ${thin ? 'thin' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={max}>
      <div className="fill" style={{ width: `${pct}%` }} />
      {label && <span className="bar-label">{label}</span>}
    </div>
  )
}
