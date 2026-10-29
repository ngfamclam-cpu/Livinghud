import type { Portrait as P } from '../../engine'

// Anime-style idol portraits, drawn from a few parameters on a 100 × 140 card.
// Every character is original. Head-and-shoulders, stage outfit, big eyes.

const SKIN = '#ffe3d3'
const SKIN_SHADE = '#f6c6b0'
const LINE = '#3b2433'

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)))
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Hair that sits behind the head and shoulders. */
function BackHair({ p }: { p: P }) {
  const c = p.hair
  switch (p.style) {
    case 'long':
      return <path d="M24,50 Q22,24 50,20 Q78,24 76,50 L80,122 Q66,128 50,126 Q34,128 20,122 Z" fill={c} />
    case 'wavy':
      return <path d="M24,50 Q22,24 50,20 Q78,24 76,50 Q84,70 76,88 Q86,104 74,120 Q50,128 26,120 Q14,104 24,88 Q16,70 24,50 Z" fill={c} />
    case 'twin':
      return (
        <>
          <path d="M28,44 Q14,52 12,80 Q10,104 20,118 Q26,96 30,76 Z" fill={c} />
          <path d="M72,44 Q86,52 88,80 Q90,104 80,118 Q74,96 70,76 Z" fill={c} />
          <path d="M28,52 Q26,26 50,22 Q74,26 72,52 L72,74 L28,74 Z" fill={c} />
        </>
      )
    case 'pony':
      return (
        <>
          <path d="M70,30 Q92,34 90,64 Q88,92 80,108 Q76,86 74,62 Z" fill={c} />
          <path d="M28,52 Q26,26 50,22 Q74,26 72,52 L72,70 L28,70 Z" fill={c} />
        </>
      )
    case 'buns':
      return (
        <>
          <circle cx="29" cy="25" r="10" fill={c} />
          <circle cx="71" cy="25" r="10" fill={c} />
          <path d="M28,52 Q26,26 50,22 Q74,26 72,52 L72,70 L28,70 Z" fill={c} />
        </>
      )
    case 'bob':
      return <path d="M26,52 Q24,24 50,20 Q76,24 74,52 L76,78 Q62,82 50,80 Q38,82 24,78 Z" fill={c} />
  }
}

/** Fringe and side locks over the face. */
function Bangs({ p }: { p: P }) {
  const c = p.hair
  const hi = shade(c, 0.18)
  return (
    <g>
      <path d="M30,48 Q30,28 50,26 Q70,28 70,48 Q66,38 60,40 Q58,32 52,38 Q48,30 44,39 Q38,34 36,42 Q32,40 30,48 Z" fill={c} />
      <path d="M30,46 Q28,60 31,70 L34,52 Z" fill={c} />
      <path d="M70,46 Q72,60 69,70 L66,52 Z" fill={c} />
      <path d="M38,31 Q46,27 56,29" stroke={hi} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
    </g>
  )
}

function Eye({ x, p, wink }: { x: number; p: P; wink: boolean }) {
  if (wink) return <path d={`M${x - 6},58 Q${x},53 ${x + 6},58`} stroke={LINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
  const cool = p.expression === 'cool'
  return (
    <g>
      <ellipse cx={x} cy={57} rx={5.2} ry={cool ? 5.4 : 6.6} fill="#fff" />
      <ellipse cx={x} cy={57.6} rx={4.2} ry={cool ? 4.6 : 5.6} fill={p.eyes} />
      <ellipse cx={x} cy={58.6} rx={2.6} ry={cool ? 3 : 3.6} fill={shade(p.eyes, -0.35)} />
      <circle cx={x - 1.6} cy={55} r={1.6} fill="#fff" />
      <circle cx={x + 1.8} cy={60} r={0.8} fill="#fff" opacity="0.9" />
      <path d={`M${x - 6},${cool ? 52.5 : 51} Q${x},${cool ? 49.5 : 48.5} ${x + 6.2},${cool ? 52 : 51}`} stroke={LINE} strokeWidth="1.9" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Mouth({ p }: { p: P }) {
  switch (p.expression) {
    case 'grin':
      return <path d="M45,68 Q50,74 55,68 Z" fill="#d6455d" stroke={LINE} strokeWidth="0.8" strokeLinejoin="round" />
    case 'cool':
      return <path d="M47,69 Q50,70 53,68.5" stroke={LINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    default:
      return <path d="M46,68 Q50,71.5 54,68" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
  }
}

function Accent({ p }: { p: P }) {
  switch (p.accent) {
    case 'star':
      return <path d="M66,30 l2.4,4.8 5.3,.8 -3.8,3.7 .9,5.3 -4.8,-2.5 -4.8,2.5 .9,-5.3 -3.8,-3.7 5.3,-.8 Z" fill="#ffe66d" stroke="#f4a259" strokeWidth="0.6" />
    case 'ribbon':
      return (
        <g fill={shade(p.outfit, 0.1)} stroke={shade(p.outfit, -0.25)} strokeWidth="0.6">
          <path d="M60,26 L70,20 L70,32 Z" />
          <path d="M60,26 L50,20 L50,32 Z" />
          <circle cx="60" cy="26" r="2.4" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <path d="M27,50 Q26,18 50,17 Q74,18 73,50" stroke="#20222b" strokeWidth="3.4" fill="none" />
          <rect x="21" y="46" width="9" height="15" rx="4" fill="#20222b" />
          <rect x="70" y="46" width="9" height="15" rx="4" fill="#20222b" />
          <rect x="22.5" y="49" width="2.5" height="9" rx="1.2" fill={p.outfit} />
          <rect x="75" y="49" width="2.5" height="9" rx="1.2" fill={p.outfit} />
        </g>
      )
    case 'flower':
      return (
        <g transform="translate(32,32)">
          {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-4" rx="2.6" ry="4" fill="#fff" transform={`rotate(${a})`} />)}
          <circle r="2.2" fill="#ffd166" />
        </g>
      )
    case 'crown':
      return <path d="M40,24 L44,15 L50,22 L56,15 L60,24 Z" fill="#ffd166" stroke="#e09f3e" strokeWidth="0.8" strokeLinejoin="round" />
    default:
      return null
  }
}

/** Shoulders and a stage outfit (a collared jacket with a gem at the neck). */
function Outfit({ p }: { p: P }) {
  const o = p.outfit
  return (
    <g>
      <path d="M14,140 Q16,104 36,96 L44,92 L56,92 L64,96 Q84,104 86,140 Z" fill={o} />
      <path d="M44,92 L50,104 L56,92 Z" fill={SKIN} />
      <path d="M36,96 L44,92 L50,108 L42,112 Z" fill={shade(o, 0.15)} />
      <path d="M64,96 L56,92 L50,108 L58,112 Z" fill={shade(o, 0.15)} />
      <path d="M20,122 Q34,116 50,118 Q66,116 80,122" stroke={shade(o, 0.3)} strokeWidth="1.4" fill="none" opacity="0.7" />
      <path d="M50,103 l2.6,3 -2.6,3 -2.6,-3 Z" fill="#fff" opacity="0.9" />
    </g>
  )
}

export function Portrait({ p, colors, id }: { p: P; colors: [string, string]; id: string }) {
  const [a, b] = colors
  return (
    <svg viewBox="0 0 100 140" className="card-svg portrait" aria-hidden>
      <defs>
        <linearGradient id={`pbg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="100" height="140" fill={`url(#pbg-${id})`} />
      {/* stage sparkles */}
      {[[14, 18, 1.6], [86, 26, 1.2], [10, 70, 1], [90, 84, 1.5], [20, 100, 0.9], [80, 112, 1.1]].map(([x, y, r], i) => (
        <path key={i} d={`M${x},${y - r * 3} L${x + r},${y} L${x},${y + r * 3} L${x - r},${y} Z M${x - r * 3},${y} L${x},${y + r} L${x + r * 3},${y} L${x},${y - r} Z`} fill="#fff" opacity="0.7" />
      ))}
      <circle cx="50" cy="58" r="40" fill="#fff" opacity="0.12" />
      <BackHair p={p} />
      <Outfit p={p} />
      {/* neck */}
      <path d="M44,78 L44,93 Q50,97 56,93 L56,78 Z" fill={SKIN_SHADE} />
      {/* face */}
      <path d="M31,50 Q31,30 50,30 Q69,30 69,50 Q69,66 60,75 Q55,80 50,80.5 Q45,80 40,75 Q31,66 31,50 Z" fill={SKIN} />
      <ellipse cx="38" cy="65" rx="4" ry="2.2" fill="#ff8fab" opacity="0.45" />
      <ellipse cx="62" cy="65" rx="4" ry="2.2" fill="#ff8fab" opacity="0.45" />
      <Eye x={41} p={p} wink={false} />
      <Eye x={59} p={p} wink={p.expression === 'wink'} />
      <path d="M50,62 l-1,2.4 h1.6" stroke={SKIN_SHADE} strokeWidth="1" fill="none" strokeLinecap="round" />
      <Mouth p={p} />
      <Bangs p={p} />
      <Accent p={p} />
      <text x="6" y="11" className="card-tag">ANIME</text>
    </svg>
  )
}
