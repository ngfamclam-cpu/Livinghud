import type { CompanionAction, HumanCompanion } from '../../engine'
import { Photo } from '../lifelog/Photo'

/**
 * A human companion's portrait, made alive with CSS: she breathes (a slow zoom),
 * light glints across the frame, and the frame glows in her colours. Without a
 * portrait yet, a soft silhouette waits.
 */
export function HumanPortrait({ human, photoId, action = null, size = 160, round = false }: { human: HumanCompanion; photoId?: string; action?: CompanionAction | 'compliment' | 'gift' | 'hangout' | null; size?: number; round?: boolean }) {
  return (
    <span
      className={`human-portrait ${round ? 'round' : ''} p-${human.personality} ${action ? `act-${action}` : ''}`}
      style={{ width: size, height: round ? size : Math.round(size * 1.4) }}
    >
      {photoId ? (
        <Photo id={photoId} alt={`${human.name}`} className="human-photo" />
      ) : (
        <span className="human-placeholder" aria-label={`${human.name}, no portrait yet`}>
          <svg viewBox="0 0 100 140" aria-hidden="true">
            <circle cx="50" cy="42" r="20" />
            <path d="M14 140 C 14 96, 30 74, 50 74 C 70 74, 86 96, 86 140 Z" />
            <path d="M30 40 C 26 14, 74 14, 70 40 C 76 60, 80 80, 72 96 L28 96 C 20 80, 24 60, 30 40 Z" opacity="0.6" />
          </svg>
          {!round && <small>{human.name}</small>}
        </span>
      )}
      <span className="human-sheen" aria-hidden="true" />
    </span>
  )
}
