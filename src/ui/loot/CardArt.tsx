import type React from 'react'
import type { Card, Pose } from '../../engine'
import { Portrait } from './Portrait'

type P = [number, number]
interface Joints {
  lElbow: P
  lHand: P
  rElbow: P
  rHand: P
  lKnee: P
  lFoot: P
  rKnee: P
  rFoot: P
  /** Sideways shift of the head and hips (a lean or a sway). */
  head?: number
  hip?: number
}

/** Stylised dance poses on a 100 × 140 stage. */
const POSES: Record<Pose, Joints> = {
  wave: { lElbow: [34, 36], lHand: [25, 25], rElbow: [66, 48], rHand: [77, 41], lKnee: [45, 94], lFoot: [42, 116], rKnee: [57, 94], rFoot: [61, 116] },
  heart: { lElbow: [37, 30], lHand: [47, 15], rElbow: [63, 30], rHand: [53, 15], lKnee: [46, 95], lFoot: [44, 116], rKnee: [56, 95], rFoot: [58, 116] },
  spin: { lElbow: [37, 31], lHand: [31, 16], rElbow: [68, 44], rHand: [83, 46], lKnee: [47, 95], lFoot: [47, 116], rKnee: [62, 88], rFoot: [52, 97] },
  point: { lElbow: [35, 56], lHand: [45, 67], rElbow: [67, 40], rHand: [86, 33], lKnee: [42, 94], lFoot: [36, 116], rKnee: [58, 94], rFoot: [64, 116] },
  kick: { lElbow: [34, 46], lHand: [21, 50], rElbow: [64, 35], rHand: [73, 24], lKnee: [48, 95], lFoot: [48, 116], rKnee: [66, 72], rFoot: [86, 58] },
  hips: { lElbow: [36, 58], lHand: [45, 69], rElbow: [68, 57], rHand: [58, 69], lKnee: [53, 95], lFoot: [57, 116], rKnee: [58, 93], rFoot: [50, 116], hip: 4 },
  'arms-up': { lElbow: [38, 29], lHand: [31, 12], rElbow: [62, 29], rHand: [69, 12], lKnee: [43, 95], lFoot: [37, 116], rKnee: [57, 95], rFoot: [63, 116] },
  mic: { lElbow: [34, 44], lHand: [21, 37], rElbow: [61, 52], rHand: [55, 33], lKnee: [46, 95], lFoot: [43, 116], rKnee: [56, 94], rFoot: [60, 116] },
  lean: { lElbow: [36, 52], lHand: [30, 64], rElbow: [64, 36], rHand: [70, 22], lKnee: [44, 92], lFoot: [34, 112], rKnee: [58, 95], rFoot: [60, 116], head: -5, hip: 3 },
  fan: { lElbow: [34, 41], lHand: [20, 36], rElbow: [66, 41], rHand: [80, 36], lKnee: [46, 95], lFoot: [44, 116], rKnee: [56, 95], rFoot: [58, 116] },
}

/** A performer's silhouette in a dance pose, rim-lit in the card's colour. */
function Dancer({ pose, color }: { pose: Pose; color: string }) {
  const j = POSES[pose]
  const hx = 50 + (j.head ?? 0)
  const px = 50 + (j.hip ?? 0)
  const limb = (a: P, b: P, c: P) => `M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}`
  return (
    <g className="dancer" stroke={color} strokeLinecap="round" strokeLinejoin="round" style={{ '--rim': color } as React.CSSProperties}>
      {/* hair, behind the head */}
      <path d={`M${hx - 9},${26} Q${hx - 12},${48} ${hx - 4},${54} L${hx + 5},${54} Q${hx + 12},${46} ${hx + 9},${26} Z`} className="hair" strokeWidth={1.5} />
      {/* arms */}
      <path d={limb([42 + (j.head ?? 0) / 2, 42], j.lElbow, j.lHand)} className="limb" strokeWidth={6} fill="none" />
      <path d={limb([58 + (j.head ?? 0) / 2, 42], j.rElbow, j.rHand)} className="limb" strokeWidth={6} fill="none" />
      {/* legs */}
      <path d={limb([px - 4, 76], j.lKnee, j.lFoot)} className="limb" strokeWidth={7} fill="none" />
      <path d={limb([px + 4, 76], j.rKnee, j.rFoot)} className="limb" strokeWidth={7} fill="none" />
      {/* torso and stage outfit */}
      <path d={`M${hx - 8},${40} L${hx + 8},${40} L${px + 6},${68} L${px - 6},${68} Z`} className="body" strokeWidth={1.5} />
      <path d={`M${px - 7},${66} L${px + 7},${66} L${px + 14},${82} L${px - 14},${82} Z`} className="skirt" strokeWidth={1.5} />
      {/* head */}
      <circle cx={hx} cy={26} r={9} className="head" strokeWidth={1.5} />
      {pose === 'mic' && <circle cx={j.rHand[0] - 1} cy={j.rHand[1] - 4} r={3} className="prop" />}
      {pose === 'fan' && (
        <>
          <path d={`M${j.lHand[0]},${j.lHand[1]} l-10,-10 a14,14 0 0,0 -4,16 Z`} className="prop" />
          <path d={`M${j.rHand[0]},${j.rHand[1]} l10,-10 a14,14 0 0,1 4,16 Z`} className="prop" />
        </>
      )}
      {pose === 'heart' && <path d="M50,9 l-4,-4 a2.6,2.6 0 0,1 4,-3 a2.6,2.6 0 0,1 4,3 Z" className="prop" />}
    </g>
  )
}

const SCENE_LABEL = { K: 'K-POP', J: 'J-POP', C: 'C-POP', A: 'ANIME' } as const

/** One collectible card. Size comes from CSS; the art scales with it. */
export function CardArt({ card, stars = 0, locked = false }: { card: Card; stars?: number; locked?: boolean }) {
  if (locked) {
    return (
      <div className={`loot-card locked kind-${card.kind}`} aria-label="Not collected yet">
        <span className="locked-mark">?</span>
      </div>
    )
  }
  const [a, b] = card.colors ?? ['#2f8fff', '#0a1426']
  const red = card.suit === '♥' || card.suit === '♦' || card.id === 'card-joker-red'
  return (
    <div className={`loot-card r-${card.rarity} kind-${card.kind} s${stars}`} aria-label={`${card.name}, ${card.rarity}${stars > 1 ? `, ${stars} stars` : ''}`}>
      {card.kind === 'idol' && card.portrait && <Portrait p={card.portrait} colors={card.colors ?? ['#ff9ad5', '#5b2a86']} id={card.id} />}
      {card.kind === 'idol' && card.pose && (
        <svg viewBox="0 0 100 140" className="card-svg" aria-hidden>
          <defs>
            <linearGradient id={`bg-${card.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={a} />
              <stop offset="1" stopColor={b} />
            </linearGradient>
            <radialGradient id={`spot-${card.id}`} cx="0.5" cy="0.15" r="0.8">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100" height="140" fill={`url(#bg-${card.id})`} />
          <path d="M30,0 L50,120 L10,120 Z M70,0 L90,120 L50,120 Z" fill="#fff" opacity="0.08" />
          <rect width="100" height="140" fill={`url(#spot-${card.id})`} />
          <ellipse cx="50" cy="118" rx="34" ry="5" fill="#000" opacity="0.35" />
          <Dancer pose={card.pose} color={a} />
          <text x="6" y="11" className="card-tag">{SCENE_LABEL[card.scene ?? 'K']}</text>
        </svg>
      )}
      {card.kind === 'relic' && (
        <div className="relic-art" aria-hidden>
          <span className="relic-icon">{card.icon}</span>
        </div>
      )}
      {card.kind === 'playing' && (
        <div className={`playing-art ${red ? 'red' : ''}`} aria-hidden>
          <span className="corner tl">{card.rank === 'JOKER' ? '★' : card.rank}<br />{card.suit}</span>
          <span className="pip">{card.rank === 'JOKER' ? '🃏' : card.suit}</span>
          <span className="corner br">{card.rank === 'JOKER' ? '★' : card.rank}<br />{card.suit}</span>
        </div>
      )}
      <div className="card-caption">
        <b>{card.name}</b>
        {card.kind === 'idol' && <small>{card.group} · {card.move}</small>}
        {stars > 0 && <span className="card-stars">{'★'.repeat(stars)}</span>}
      </div>
    </div>
  )
}
