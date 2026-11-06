import { useId, type ReactNode } from 'react'
import type { CompanionAction, CompanionMood, PetDef } from '../../engine'

/**
 * Draws any pet from parts: a glowing body plus the ears, tail, wings, horns,
 * shell or crest of its kind, in its element's colours. Bigger and grander as it
 * levels up (level 4+ gains an aura, level 5 a crown). Uses the same animation
 * classes as Pip (breathe, blink, wag, flap, sparkle; pet/feed/play reactions).
 */
export function PetArt({ pet, level, mood, action = null, size = 120 }: { pet: PetDef; level: number; mood: CompanionMood; action?: CompanionAction | null; size?: number }) {
  const uid = useId().replace(/:/g, '')
  const [top, bottom, accent] = pet.colors
  const fill = `url(#pb-${uid})`
  const glow = `url(#pg-${uid})`
  const scale = 0.78 + Math.min(level, 5) * 0.06
  const happy = mood === 'happy' || action !== null
  const parts = PARTS[pet.body]({ fill, accent, top, level })
  const beak = pet.body === 'owl' || pet.body === 'griffin' || pet.body === 'phoenix' || pet.body === 'thunderbird'

  return (
    <svg className={`companion-art pet-art body-${pet.body} el-${pet.element} mood-${mood} ${action ? `act-${action}` : ''}`} viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${pet.name}, level ${level}, feeling ${mood}`}>
      <defs>
        <radialGradient id={`pb-${uid}`} cx="38%" cy="28%" r="80%"><stop offset="0%" stopColor={top} /><stop offset="100%" stopColor={bottom} /></radialGradient>
        <radialGradient id={`pg-${uid}`}><stop offset="0%" stopColor={accent} stopOpacity={level >= 4 ? 0.7 : 0.45} /><stop offset="100%" stopColor={accent} stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="60" cy="66" r={level >= 4 ? 58 : 52} fill={glow} className="c-aura" />
      {level >= 3 && <Sparkles color={accent} element={pet.element} />}
      <g transform={`translate(60 70) scale(${scale}) translate(-60 -70)`}>
        <g className="c-body-group">
          {parts.back}
          {pet.body === 'serpent' || pet.body === 'wyrm' ? (
            <path d="M24 88 C 10 70, 30 56, 46 66 C 58 74, 62 60, 60 50 C 74 52, 88 62, 84 80 C 80 96, 50 100, 24 88 Z" fill={fill} />
          ) : (
            <ellipse cx="60" cy="70" rx="30" ry="27" fill={fill} />
          )}
          <ellipse cx="60" cy="80" rx="17" ry="13" fill="#ffffff" opacity="0.28" />
          {parts.front}
          <g className="c-eyes">
            <ellipse cx="49" cy="62" rx={beak ? 7 : 6} ry={beak ? 7 : 7.5} fill="#1b1033" />
            <ellipse cx="71" cy="62" rx={beak ? 7 : 6} ry={beak ? 7 : 7.5} fill="#1b1033" />
            <circle cx="51" cy="59" r="2.4" fill="#fff" />
            <circle cx="73" cy="59" r="2.4" fill="#fff" />
            <circle cx="47.5" cy="64" r="1" fill={accent} />
            <circle cx="69.5" cy="64" r="1" fill={accent} />
          </g>
          {mood === 'sulky' && !action && <path d="M41 52 L53 55 M79 52 L67 55" className="c-mouth" />}
          {happy && <ellipse cx="40" cy="72" rx="5" ry="3" fill="#ff7ab8" opacity="0.55" />}
          {happy && <ellipse cx="80" cy="72" rx="5" ry="3" fill="#ff7ab8" opacity="0.55" />}
          {beak ? (
            <path d="M55 68 L65 68 L60 76 Z" fill={pet.body === 'phoenix' || pet.body === 'thunderbird' ? '#ffd34d' : '#ffb347'} className={action === 'feed' ? 'c-chew' : ''} />
          ) : action === 'feed' ? (
            <ellipse cx="60" cy="74" rx="4.5" ry="3.5" fill="#1b1033" className="c-chew" />
          ) : happy ? (
            <path d="M53 71 Q60 79 67 71" className="c-mouth" />
          ) : mood === 'sulky' ? (
            <path d="M54 76 Q60 70 66 76" className="c-mouth" />
          ) : (
            <path d="M56 73 Q60 76 64 73" className="c-mouth" />
          )}
          {level >= 5 && <path className="c-crown" d="M44 32 L49 20 L54 29 L60 16 L66 29 L71 20 L76 32 Z" fill="#ffd34d" stroke="#fff3b0" strokeWidth="1.2" />}
        </g>
      </g>
    </svg>
  )
}

function Sparkles({ color, element }: { color: string; element: PetDef['element'] }) {
  const star = (x: number, y: number, r: number) => `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`
  const bolt = (x: number, y: number) => `M${x} ${y} l-4 8 h4 l-3 8 l8 -10 h-4 l3 -6 Z`
  const drop = (x: number, y: number) => `M${x} ${y} c3 5 5 8 0 10 c-5 -2 -3 -5 0 -10 Z`
  const shape = element === 'storm' ? bolt : element === 'fire' || element === 'water' ? drop : (x: number, y: number) => star(x, y, 5)
  return (
    <g className="c-sparkles" fill={color}>
      <path d={shape(16, 26)} />
      <path d={shape(100, 20)} />
      <path d={shape(104, 84)} />
    </g>
  )
}

interface PartArgs {
  fill: string
  accent: string
  top: string
  level: number
}
type Parts = (a: PartArgs) => { back?: ReactNode; front?: ReactNode }

const pointyEars = (fill: string, accent: string) => (
  <g className="c-ears">
    <path d="M38 50 L30 22 L54 40 Z" fill={fill} />
    <path d="M82 50 L90 22 L66 40 Z" fill={fill} />
    <path d="M39 43 L35 29 L47 38 Z" fill={accent} opacity="0.8" />
    <path d="M81 43 L85 29 L73 38 Z" fill={accent} opacity="0.8" />
  </g>
)
const featherWings = (accent: string) => (
  <g className="c-wing" fill={accent} opacity="0.85">
    <path d="M32 70 C 6 62, 2 38, 18 34 C 22 48, 30 58, 38 64 Z" />
    <path d="M88 70 C 114 62, 118 38, 102 34 C 98 48, 90 58, 82 64 Z" />
  </g>
)
const batWings = (accent: string) => (
  <g className="c-wing" fill={accent} opacity="0.8">
    <path d="M32 66 L4 40 L12 58 L2 62 L16 70 L8 80 L34 76 Z" />
    <path d="M88 66 L116 40 L108 58 L118 62 L104 70 L112 80 L86 76 Z" />
  </g>
)
const horns = (color: string) => (
  <g fill={color}>
    <path d="M46 46 L40 22 L54 42 Z" />
    <path d="M74 46 L80 22 L66 42 Z" />
  </g>
)
const antlers = (color: string, leaves?: string) => (
  <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
    <path d="M46 46 L40 26 M42 32 L32 28 M41 28 L44 18" />
    <path d="M74 46 L80 26 M78 32 L88 28 M79 28 L76 18" />
    {leaves && <g fill={leaves} stroke="none"><circle cx="32" cy="28" r="3" /><circle cx="88" cy="28" r="3" /><circle cx="44" cy="17" r="2.5" /><circle cx="76" cy="17" r="2.5" /></g>}
  </g>
)
const fluffyTail = (fill: string, tip: string, angle = 0) => (
  <g className="c-tail" transform={`rotate(${angle} 84 86)`}>
    <path d="M82 88 C 108 92, 116 66, 102 56 C 100 70, 94 80, 80 80 Z" fill={fill} />
    <path d="M102 56 C 108 62, 108 70, 104 74 C 102 68, 100 62, 102 56 Z" fill={tip} />
  </g>
)

const PARTS: Record<PetDef['body'], Parts> = {
  pip: () => ({}),
  fox: ({ fill, accent }) => ({ back: fluffyTail(fill, accent), front: pointyEars(fill, accent) }),
  otter: ({ fill, accent }) => ({
    back: <path className="c-tail" d="M84 86 C 104 92, 112 84, 106 76 C 100 82, 92 82, 84 80 Z" fill={fill} />,
    front: (
      <>
        <g fill={fill}><circle cx="40" cy="48" r="7" /><circle cx="80" cy="48" r="7" /></g>
        <g stroke={accent} strokeWidth="1.2" opacity="0.8"><path d="M44 72 L30 70 M44 75 L31 77 M76 72 L90 70 M76 75 L89 77" /></g>
      </>
    ),
  }),
  stag: ({ fill, accent }) => ({ front: <>{antlers('#8b5a2b', accent)}{pointyEars(fill, accent)}</> }),
  wolf: ({ fill, accent }) => ({
    back: <path className="c-tail" d="M82 86 L110 70 L100 82 L114 84 L96 92 Z" fill={fill} />,
    front: (
      <>
        {pointyEars(fill, accent)}
        <path d="M40 76 L36 88 L46 84 L50 94 L56 86 L64 94 L68 84 L78 88 L74 76 Z" fill="#ffffff" opacity="0.35" />
      </>
    ),
  }),
  lynx: ({ fill, accent }) => ({
    back: <path className="c-tail" d="M84 88 C 98 90, 102 80, 96 76 C 92 82, 88 84, 82 82 Z" fill={fill} />,
    front: (
      <>
        {pointyEars(fill, accent)}
        <g stroke="#1b1033" strokeWidth="2"><path d="M30 22 L28 14 M90 22 L92 14" /></g>
        <g fill={accent} opacity="0.7"><circle cx="44" cy="80" r="2.5" /><circle cx="76" cy="82" r="2.5" /><circle cx="60" cy="90" r="2" /></g>
      </>
    ),
  }),
  tortoise: ({ accent }) => ({
    back: (
      <g>
        <path d="M24 74 Q60 20 96 74 Z" fill={accent} opacity="0.9" />
        <path d="M36 70 L48 46 L60 70 L72 46 L84 70" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
        <path d="M52 40 L60 26 L68 40 Z" fill="#ffffff" opacity="0.7" />
      </g>
    ),
  }),
  kitsune: ({ fill, accent, level }) => {
    const tails = Math.min(9, Math.max(1, level * 2 - 1))
    return {
      back: (
        <g className="c-tail">
          {Array.from({ length: tails }, (_, i) => {
            const angle = -60 + (120 / Math.max(1, tails - 1)) * i
            return (
              <g key={i} transform={`rotate(${tails === 1 ? 0 : angle} 60 82)`}>
                <path d="M60 82 C 66 56, 70 36, 60 18 C 54 36, 52 60, 60 82 Z" fill={fill} />
                <path d="M60 18 C 63 24, 63 30, 60 34 C 57 30, 57 24, 60 18 Z" fill={accent} />
              </g>
            )
          })}
        </g>
      ),
      front: pointyEars(fill, accent),
    }
  },
  griffin: ({ fill, accent }) => ({
    back: <>{featherWings(accent)}<path className="c-tail" d="M84 88 C 100 96, 108 90, 106 82" fill="none" stroke={fill} strokeWidth="4" /><circle cx="106" cy="80" r="4" fill={accent} /></>,
    front: <g fill={accent}><path d="M40 46 L34 30 L48 42 Z" /><path d="M80 46 L86 30 L72 42 Z" /></g>,
  }),
  serpent: ({ accent }) => ({
    back: (
      <g fill={accent} opacity="0.85">
        <path className="c-wing" d="M34 64 L16 50 L26 70 Z" />
        <path className="c-wing" d="M86 64 L104 50 L94 70 Z" />
        <path d="M54 46 L60 30 L66 46 Z" />
      </g>
    ),
  }),
  owl: ({ fill, accent }) => ({
    back: featherWings(accent),
    front: (
      <>
        <g fill={fill}><path d="M38 48 L34 30 L48 42 Z" /><path d="M82 48 L86 30 L72 42 Z" /></g>
        <g fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5"><path d="M50 84 q4 3 8 0 M62 84 q4 3 8 0 M56 90 q4 3 8 0" /></g>
      </>
    ),
  }),
  dragon: ({ fill, accent, level }) => ({
    back: (
      <>
        {level >= 2 && batWings(accent)}
        <path className="c-tail" d="M82 88 C 104 96, 112 80, 106 68 L112 66 L104 60 L100 70 C 102 80, 96 86, 82 82 Z" fill={fill} />
      </>
    ),
    front: (
      <>
        {horns('#ffe08a')}
        <g stroke={accent} strokeWidth="1.5" fill="none" opacity="0.9"><path d="M44 74 C 30 74, 24 80, 18 78 M76 74 C 90 74, 96 80, 102 78" /></g>
      </>
    ),
  }),
  qilin: ({ fill, accent }) => ({
    back: <path className="c-tail" d="M82 86 C 98 92, 108 80, 102 70 C 100 78, 94 82, 84 80 Z" fill={accent} />,
    front: (
      <>
        {antlers('#ffd34d')}
        <g fill={accent} opacity="0.75"><path d="M36 58 l-6 -4 l4 8 Z" /><path d="M84 58 l6 -4 l-4 8 Z" /></g>
        <g fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.2"><path d="M48 86 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0" /></g>
        <path d="M60 30 C 54 38, 66 40, 60 48" stroke={fill} strokeWidth="4" fill="none" />
      </>
    ),
  }),
  phoenix: ({ accent, top }) => ({
    back: (
      <>
        <g className="c-wing" fill={accent}>
          <path d="M34 68 C 8 64, 0 36, 14 26 C 18 44, 26 56, 40 62 Z" />
          <path d="M86 68 C 112 64, 120 36, 106 26 C 102 44, 94 56, 80 62 Z" />
        </g>
        <g className="c-tail" fill={top}>
          <path d="M60 92 C 56 104, 46 112, 38 114 C 48 106, 52 98, 54 92 Z" />
          <path d="M62 92 C 66 104, 76 112, 84 114 C 74 106, 70 98, 68 92 Z" />
        </g>
      </>
    ),
    front: <g fill={accent}><path d="M60 46 C 52 34, 58 24, 60 14 C 62 24, 70 30, 64 46 Z" /><path d="M54 46 C 46 38, 48 30, 50 24 C 54 32, 58 38, 58 46 Z" /></g>,
  }),
  moth: ({ accent, top }) => ({
    back: (
      <g className="c-wing">
        <ellipse cx="30" cy="56" rx="22" ry="26" fill={accent} opacity="0.85" />
        <ellipse cx="90" cy="56" rx="22" ry="26" fill={accent} opacity="0.85" />
        <circle cx="28" cy="54" r="7" fill={top} />
        <circle cx="92" cy="54" r="7" fill={top} />
      </g>
    ),
    front: <g fill="none" stroke="#e9dcff" strokeWidth="2" strokeLinecap="round"><path d="M52 46 C 46 30, 40 28, 36 24 M68 46 C 74 30, 80 28, 84 24" /></g>,
  }),
  wyrm: ({ accent }) => ({
    back: batWings(accent),
    front: (
      <>
        {horns('#ff3d6e')}
        <circle cx="60" cy="84" r="6" fill="none" stroke="#ff3d6e" strokeWidth="2" opacity="0.7" />
      </>
    ),
  }),
  thunderbird: ({ accent, top }) => ({
    back: (
      <g className="c-wing">
        <path d="M34 66 C 6 58, 0 30, 12 22 L18 40 L22 30 L28 50 L34 42 Z" fill={top} />
        <path d="M86 66 C 114 58, 120 30, 108 22 L102 40 L98 30 L92 50 L86 42 Z" fill={top} />
        <path d="M16 44 l-4 8 h4 l-3 8 l8 -10 h-4 l3 -6 Z" fill={accent} />
        <path d="M104 44 l4 8 h-4 l3 8 l-8 -10 h4 l-3 -6 Z" fill={accent} />
      </g>
    ),
    front: <g fill={top}><path d="M52 44 L48 26 L58 40 Z" /><path d="M60 42 L60 20 L64 40 Z" /><path d="M68 44 L72 26 L62 40 Z" /></g>,
  }),
}
