import { useId } from 'react'
import type { CompanionAction, CompanionMood } from '../../engine'

/** Colours per stage: body top, body bottom, belly, accent (ears/wings/tail tip). */
const PALETTE: Record<string, [string, string, string, string]> = {
  egg: ['#fff4fb', '#d9c8ff', '#ffffff', '#b18cff'],
  hatchling: ['#8ef7d4', '#2fbfa0', '#e6fff7', '#ffd36e'],
  sprite: ['#ffb3e6', '#c055ff', '#fff0fb', '#7af3ff'],
  wisp: ['#9ce8ff', '#3c7bff', '#e9fbff', '#d6a6ff'],
  drake: ['#d79bff', '#6a2bd9', '#f6e8ff', '#ff6fae'],
  elder: ['#ffe28a', '#ff7a3d', '#fff7dc', '#b06cff'],
}

const ORDER = ['egg', 'hatchling', 'sprite', 'wisp', 'drake', 'elder']

/**
 * Your companion: an egg that hatches and grows ears, a tail, wings, horns and a
 * crown. It breathes, blinks and wags; `action` plays a reaction (pet, feed, play).
 */
export function CompanionArt({ stage, mood, action = null, size = 120 }: { stage: string; mood: CompanionMood; action?: CompanionAction | null; size?: number }) {
  const uid = useId().replace(/:/g, '')
  const level = Math.max(0, ORDER.indexOf(stage))
  const [top, bottom, belly, accent] = PALETTE[stage] ?? PALETTE.hatchling
  const body = `cb-${uid}`
  const glow = `cg-${uid}`
  const happy = mood === 'happy' || action !== null

  if (level === 0) {
    return (
      <svg className={`companion-art egg ${action ? `act-${action}` : ''}`} viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="A glowing egg">
        <defs>
          <radialGradient id={body} cx="40%" cy="30%" r="75%"><stop offset="0%" stopColor={top} /><stop offset="100%" stopColor={bottom} /></radialGradient>
          <radialGradient id={glow}><stop offset="0%" stopColor={accent} stopOpacity="0.55" /><stop offset="100%" stopColor={accent} stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="60" cy="66" r="52" fill={`url(#${glow})`} className="c-aura" />
        <g className="c-wobble">
          <ellipse cx="60" cy="68" rx="30" ry="38" fill={`url(#${body})`} />
          <path d="M36 62 l9 -7 l8 9 l8 -10 l9 9 l10 -6" className="c-crack" />
          <circle cx="50" cy="48" r="5" fill="#fff" opacity="0.8" />
          <circle cx="71" cy="82" r="3" fill={accent} opacity="0.6" />
          <circle cx="45" cy="86" r="2.5" fill={accent} opacity="0.5" />
        </g>
      </svg>
    )
  }

  const eyeY = mood === 'sulky' && !action ? 64 : 62
  return (
    <svg className={`companion-art mood-${mood} ${action ? `act-${action}` : ''}`} viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Your companion, a ${stage}, feeling ${mood}`}>
      <defs>
        <radialGradient id={body} cx="38%" cy="28%" r="80%"><stop offset="0%" stopColor={top} /><stop offset="100%" stopColor={bottom} /></radialGradient>
        <radialGradient id={glow}><stop offset="0%" stopColor={accent} stopOpacity="0.5" /><stop offset="100%" stopColor={accent} stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="60" cy="70" r="56" fill={`url(#${glow})`} className="c-aura" />
      {level >= 3 && (
        <g className="c-sparkles" fill={accent}>
          <path d="M18 30 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" />
          <path d="M100 22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" />
          <path d="M104 86 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" />
        </g>
      )}
      <g className="c-body-group">
        {/* Tail behind the body, wagging. */}
        <path className="c-tail" d="M84 92 C 104 96, 110 78, 100 70 C 98 80, 92 86, 82 84 Z" fill={`url(#${body})`} />
        <circle className="c-tail-tip" cx="101" cy="71" r="4" fill={accent} />
        {level >= 3 && (
          <g className="c-wing" fill={accent} opacity="0.75">
            <path d="M30 70 C 8 56, 8 36, 24 38 C 28 50, 32 58, 36 64 Z" />
            <path d="M90 70 C 112 56, 112 36, 96 38 C 92 50, 88 58, 84 64 Z" />
          </g>
        )}
        {level >= 2 && (
          <g className="c-ears">
            <path d="M38 44 L32 18 L54 36 Z" fill={`url(#${body})`} />
            <path d="M82 44 L88 18 L66 36 Z" fill={`url(#${body})`} />
            <path d="M39 38 L36 25 L47 34 Z" fill={accent} opacity="0.8" />
            <path d="M81 38 L84 25 L73 34 Z" fill={accent} opacity="0.8" />
          </g>
        )}
        {level >= 4 && (
          <g fill="#fff3c4">
            <path d="M50 36 L54 16 L60 34 Z" />
            <path d="M70 36 L66 16 L60 34 Z" />
          </g>
        )}
        {level >= 5 && <path className="c-crown" d="M40 28 L46 12 L53 24 L60 8 L67 24 L74 12 L80 28 Z" fill="#ffd34d" stroke="#fff3b0" strokeWidth="1.5" />}
        <ellipse cx="60" cy="70" rx={28 + level * 2} ry={26 + level * 2} fill={`url(#${body})`} />
        <ellipse cx="60" cy="80" rx={16 + level} ry={13 + level} fill={belly} opacity="0.85" />
        <g className="c-eyes">
          <ellipse cx="49" cy={eyeY} rx="6" ry="7.5" fill="#1b1033" />
          <ellipse cx="71" cy={eyeY} rx="6" ry="7.5" fill="#1b1033" />
          <circle cx="51" cy={eyeY - 3} r="2.4" fill="#fff" />
          <circle cx="73" cy={eyeY - 3} r="2.4" fill="#fff" />
          <circle cx="47.5" cy={eyeY + 2} r="1.1" fill="#fff" opacity="0.8" />
          <circle cx="69.5" cy={eyeY + 2} r="1.1" fill="#fff" opacity="0.8" />
        </g>
        {happy && <ellipse cx="40" cy="73" rx="5" ry="3" fill="#ff7ab8" opacity="0.6" />}
        {happy && <ellipse cx="80" cy="73" rx="5" ry="3" fill="#ff7ab8" opacity="0.6" />}
        {action === 'feed' ? (
          <ellipse cx="60" cy="76" rx="5" ry="4" fill="#1b1033" className="c-chew" />
        ) : happy ? (
          <path d="M52 73 Q60 82 68 73" className="c-mouth" />
        ) : mood === 'sulky' ? (
          <>
            <path d="M53 78 Q60 72 67 78" className="c-mouth" />
            <path d="M42 54 L54 57 M78 54 L66 57" className="c-mouth" />
          </>
        ) : (
          <path d="M55 75 Q60 78 65 75" className="c-mouth" />
        )}
      </g>
    </svg>
  )
}
