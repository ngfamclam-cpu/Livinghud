import type { CompanionMood } from '../../engine'

/** Your companion, drawn by stage: an egg that hatches and grows ears, wings, horns and a crown. */
export function CompanionArt({ stage, mood, size = 96 }: { stage: string; mood: CompanionMood; size?: number }) {
  const order = ['egg', 'hatchling', 'sprite', 'wisp', 'drake', 'elder']
  const level = Math.max(0, order.indexOf(stage))
  if (level === 0) {
    return (
      <svg className="companion-art egg" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="A glowing egg">
        <ellipse cx="50" cy="56" rx="26" ry="34" className="c-body" />
        <path d="M30 52 l8 -6 l7 8 l7 -9 l8 8 l9 -5" className="c-line" />
        <circle cx="42" cy="40" r="4" className="c-shine" />
      </svg>
    )
  }
  const eyeY = mood === 'sulky' ? 56 : 54
  return (
    <svg className={`companion-art mood-${mood}`} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Your companion, ${stage}, looking ${mood}`}>
      {level >= 3 && (
        <g className="c-wing">
          <path d="M22 58 C 4 44, 6 30, 20 34 C 24 44, 28 50, 30 56 Z" />
          <path d="M78 58 C 96 44, 94 30, 80 34 C 76 44, 72 50, 70 56 Z" />
        </g>
      )}
      {level >= 2 && (
        <g className="c-ear">
          <path d="M32 36 L28 16 L44 30 Z" />
          <path d="M68 36 L72 16 L56 30 Z" />
        </g>
      )}
      {level >= 4 && (
        <g className="c-horn">
          <path d="M42 28 L46 12 L50 28 Z" />
          <path d="M58 28 L54 12 L50 28 Z" />
        </g>
      )}
      {level >= 5 && <path className="c-crown" d="M34 22 L40 10 L46 20 L50 6 L54 20 L60 10 L66 22 Z" />}
      <ellipse cx="50" cy="60" rx={24 + level * 2} ry={22 + level * 2} className="c-body" />
      <circle cx="41" cy={eyeY} r="4" className="c-eye" />
      <circle cx="59" cy={eyeY} r="4" className="c-eye" />
      {mood === 'happy' && <path d="M42 66 Q50 74 58 66" className="c-line" />}
      {mood === 'calm' && <path d="M44 68 L56 68" className="c-line" />}
      {mood === 'sulky' && <path d="M42 71 Q50 64 58 71" className="c-line" />}
      {mood === 'sulky' && <path d="M35 48 L45 51 M65 48 L55 51" className="c-line" />}
      {mood === 'happy' && <circle cx="34" cy="64" r="3" className="c-blush" />}
      {mood === 'happy' && <circle cx="66" cy="64" r="3" className="c-blush" />}
    </svg>
  )
}
