import type { SoldierKind } from '../../engine'

/**
 * A shadow soldier silhouette: dark body, violet rim glow, burning eyes, and the
 * weapon or shape of its kind. Animated by CSS (idle sway, eye flicker).
 */
export function ShadowFigure({ kind, veteran = false, size = 64 }: { kind: SoldierKind; veteran?: boolean; size?: number }) {
  const quad = kind === 'Hound' || kind === 'Rider'
  return (
    <svg className={`shadow-figure kind-${kind.toLowerCase()} ${veteran ? 'veteran' : ''}`} viewBox="0 0 64 72" width={size} height={size * 1.125} role="img" aria-label={kind}>
      <ellipse cx="32" cy="68" rx="18" ry="3" className="sf-shadow" />
      <g className="sf-body">
        {quad ? <Beast rider={kind === 'Rider'} /> : <Humanoid kind={kind} />}
      </g>
    </svg>
  )
}

function Humanoid({ kind }: { kind: SoldierKind }) {
  return (
    <>
      {/* Cape for knights and elites. */}
      {(kind === 'Knight' || kind === 'Elite') && <path className="sf-cape" d="M22 26 L16 64 L48 64 L42 26 Z" />}
      {/* Legs, torso, arms, head. */}
      <path className="sf-fill" d="M26 46 L24 66 L30 66 L32 52 L34 66 L40 66 L38 46 Z" />
      <path className="sf-fill" d="M22 26 Q32 20 42 26 L40 48 L24 48 Z" />
      <path className="sf-fill" d="M22 27 L15 44 L19 46 L25 33 Z" />
      <path className="sf-fill" d="M42 27 L49 44 L45 46 L39 33 Z" />
      <circle className="sf-fill" cx="32" cy="16" r="8" />
      {/* Helmet crest or hood. */}
      {kind === 'Mage' ? <path className="sf-fill" d="M22 18 L32 0 L42 18 Z" /> : <path className="sf-fill" d="M25 12 Q32 2 39 12 Z" />}
      {kind === 'Elite' && <path className="sf-crown" d="M24 8 L27 1 L30 6 L32 0 L34 6 L37 1 L40 8 Z" />}
      {/* Weapon. */}
      {kind === 'Footman' && <><path className="sf-steel" d="M48 44 L56 18 L58 19 L50 45 Z" /><rect className="sf-fill" x="8" y="30" width="10" height="16" rx="3" /></>}
      {kind === 'Archer' && <><path className="sf-steel-line" d="M12 22 Q2 38 12 54" /><path className="sf-glow-line" d="M12 22 L12 54" /></>}
      {kind === 'Spearman' && <><path className="sf-steel-line" d="M50 64 L54 4" /><path className="sf-steel" d="M54 0 L57 8 L51 8 Z" /></>}
      {kind === 'Mage' && <><path className="sf-steel-line" d="M50 64 L50 14" /><circle className="sf-orb" cx="50" cy="11" r="4" /></>}
      {kind === 'Knight' && <><rect className="sf-steel" x="6" y="28" width="12" height="20" rx="2" /><path className="sf-steel" d="M47 46 L58 12 L60 13 L49 47 Z" /></>}
      {kind === 'Elite' && <path className="sf-steel" d="M47 48 L60 6 L62 8 L50 49 Z" />}
      {/* Eyes. */}
      <g className="sf-eyes">
        <rect x="27.5" y="15" width="3" height="1.8" rx="0.9" />
        <rect x="33.5" y="15" width="3" height="1.8" rx="0.9" />
      </g>
    </>
  )
}

function Beast({ rider }: { rider: boolean }) {
  return (
    <>
      <path className="sf-fill" d="M10 40 Q20 30 40 32 Q50 30 54 38 L56 34 L60 36 L56 46 Q52 50 46 48 L44 64 L39 64 L38 50 L22 50 L20 64 L15 64 L15 48 Q8 46 6 52 L4 50 Q6 42 10 40 Z" />
      <path className="sf-fill" d="M52 30 L54 22 L57 30 Z" />
      <g className="sf-eyes"><rect x="53" y="36" width="3" height="1.6" rx="0.8" /></g>
      {rider && (
        <>
          <path className="sf-fill" d="M26 32 Q30 18 36 22 L36 34 Z" />
          <circle className="sf-fill" cx="31" cy="14" r="5" />
          <path className="sf-steel-line" d="M38 22 L52 6" />
          <g className="sf-eyes"><rect x="31" y="13" width="2.5" height="1.4" rx="0.7" /></g>
        </>
      )}
    </>
  )
}
