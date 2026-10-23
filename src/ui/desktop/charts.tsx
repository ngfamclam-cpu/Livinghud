import { useState, type ReactNode } from 'react'

// Small hand-drawn SVG charts for the dashboard. Colours come from CSS
// variables (--chart-*), so they follow the System/Clean look and loot themes.
// Every chart has a hover readout and a text alternative.

interface Tip {
  x: number
  y: number
  text: ReactNode
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.text}
    </div>
  )
}

const niceMax = (n: number) => {
  if (n <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= n) ?? n
}

/** A 2px line with an end dot; hover shows the nearest point. */
export function LineChart({
  points,
  max,
  height = 120,
  format = v => String(v),
  label,
  showAxis = true,
}: {
  points: { x: string; y: number; label?: string }[]
  max?: number
  height?: number
  format?: (v: number) => string
  label: string
  showAxis?: boolean
}) {
  const [tip, setTip] = useState<Tip | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const width = 320
  const padL = showAxis ? 28 : 4
  const padR = 8
  const padT = 8
  const padB = showAxis ? 18 : 6
  const top = max ?? niceMax(Math.max(...points.map(p => p.y), 0))
  const w = width - padL - padR
  const h = height - padT - padB
  const xAt = (i: number) => padL + (points.length > 1 ? (i * w) / (points.length - 1) : w / 2)
  const yAt = (v: number) => padT + h - (Math.min(v, top) / top) * h
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join('')
  const last = points.length - 1

  const move = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const rel = ((e.clientX - box.left) / box.width) * width
    const i = Math.max(0, Math.min(last, Math.round(((rel - padL) / w) * last)))
    setHover(i)
    const p = points[i]
    setTip({ x: (xAt(i) / width) * box.width, y: (yAt(p.y) / height) * box.height, text: <><b>{format(p.y)}</b> {p.label ?? p.x}</> })
  }

  if (points.length === 0) return <p className="muted">No data yet.</p>
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {showAxis &&
          [0, 0.5, 1].map(f => (
            <g key={f}>
              <line className="grid" x1={padL} x2={width - padR} y1={yAt(top * f)} y2={yAt(top * f)} />
              <text className="axis" x={padL - 4} y={yAt(top * f) + 3} textAnchor="end">{format(top * f)}</text>
            </g>
          ))}
        <path className="area" d={`${path}L${xAt(last)},${padT + h}L${xAt(0)},${padT + h}Z`} />
        <path className="line" d={path} />
        {hover !== null && <line className="crosshair" x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + h} />}
        <circle className="dot" cx={xAt(hover ?? last)} cy={yAt(points[hover ?? last].y)} r={4} />
        {showAxis && (
          <>
            <text className="axis" x={padL} y={height - 4}>{points[0].label ?? points[0].x}</text>
            <text className="axis" x={width - padR} y={height - 4} textAnchor="end">{points[last].label ?? points[last].x}</text>
          </>
        )}
        <rect className="hit" x={0} y={0} width={width} height={height} onPointerMove={move} onPointerLeave={() => { setTip(null); setHover(null) }} />
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}

/** Columns from one baseline, capped at 24px, rounded at the data end. */
export function ColumnChart({
  bars,
  height = 140,
  format = v => String(v),
  label,
  reference,
}: {
  bars: { key: string; label: string; value: number; tip?: ReactNode; muted?: boolean }[]
  height?: number
  format?: (v: number) => string
  label: string
  /** A dashed-free hairline target, e.g. the monthly budget. */
  reference?: { value: number; label: string }
}) {
  const [tip, setTip] = useState<Tip | null>(null)
  const width = 320
  const padL = 34
  const padT = 10
  const padB = 18
  const top = niceMax(Math.max(...bars.map(b => b.value), reference?.value ?? 0, 0))
  const h = height - padT - padB
  const band = (width - padL) / Math.max(1, bars.length)
  const bw = Math.min(24, band * 0.6)
  const yAt = (v: number) => padT + h - (v / top) * h

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {[0, 0.5, 1].map(f => (
          <g key={f}>
            <line className="grid" x1={padL} x2={width} y1={yAt(top * f)} y2={yAt(top * f)} />
            <text className="axis" x={padL - 4} y={yAt(top * f) + 3} textAnchor="end">{format(top * f)}</text>
          </g>
        ))}
        {reference && (
          <g>
            <line className="reference" x1={padL} x2={width} y1={yAt(reference.value)} y2={yAt(reference.value)} />
            <text className="axis" x={width - 2} y={yAt(reference.value) - 4} textAnchor="end">{reference.label}</text>
          </g>
        )}
        {bars.map((b, i) => {
          const x = padL + i * band + (band - bw) / 2
          const y = yAt(b.value)
          const bh = padT + h - y
          const r = Math.min(4, bh, bw / 2)
          const d = bh <= 0 ? '' : `M${x},${padT + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${padT + h}Z`
          return (
            <g
              key={b.key}
              onPointerEnter={e => {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setTip({ x: ((x + bw / 2) / width) * box.width, y: (y / height) * box.height, text: b.tip ?? <><b>{format(b.value)}</b> {b.label}</> })
              }}
              onPointerLeave={() => setTip(null)}
            >
              <rect className="hit" x={padL + i * band} y={padT} width={band} height={h} />
              {d && <path className={`column ${b.muted ? 'muted' : ''}`} d={d} />}
              {(bars.length <= 8 || i % Math.ceil(bars.length / 7) === 0 || i === bars.length - 1) && (
                <text className="axis" x={x + bw / 2} y={height - 4} textAnchor="middle">{b.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}

/** The stat hexagon: one axis per stat, 0-100. Values are labelled at each point. */
export function Radar({ values, size = 220 }: { values: { key: string; value: number }[]; size?: number }) {
  const c = size / 2
  const r = c - 44
  const n = values.length
  const at = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)]
  }
  const ring = (v: number) => values.map((_, i) => at(i, v).join(',')).join(' ')
  if (n < 3) return null
  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Stats: ${values.map(v => `${v.key} ${v.value}`).join(', ')}`}>
      {[25, 50, 75, 100].map(v => <polygon key={v} className="grid" points={ring(v)} />)}
      {values.map((_, i) => {
        const [x, y] = at(i, 100)
        return <line key={i} className="grid" x1={c} y1={c} x2={x} y2={y} />
      })}
      <polygon className="shape" points={values.map((v, i) => at(i, Math.max(4, v.value)).join(',')).join(' ')} />
      {values.map((v, i) => {
        const [x, y] = at(i, 122)
        return (
          <text key={v.key} className="radar-label" x={x} y={y + 4} textAnchor="middle">
            {v.key} <tspan className="radar-value">{v.value}</tspan>
          </text>
        )
      })}
    </svg>
  )
}

/** A thin 12-ish point trend for a stat tile. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null
  const w = 100
  const h = 28
  const top = 100
  const xAt = (i: number) => (i * w) / (values.length - 1)
  const yAt = (v: number) => 2 + (h - 4) * (1 - v / top)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join('')
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <path className="line" d={d} />
    </svg>
  )
}
