import { THEMES, allBadges, featureOn, type Player, type Summary } from '../engine'
import { setTheme, setTitle } from '../db/actions'
import { SystemWindow } from './SystemWindow'

/** Settings panel: pick a title from earned badges and a HUD theme from loot. */
export function TitlesLoot({ player, summary }: { player: Player; summary: Summary }) {
  const showBadges = featureOn(player, 'badges')
  const showLoot = featureOn(player, 'loot')
  if (!showBadges && !showLoot) return null
  const earned = new Set(summary.badges.map(b => b.id))
  const current = player.theme && summary.themes.includes(player.theme) ? player.theme : 'system'

  return (
    <SystemWindow title="Titles and loot">
      {showBadges && (
        <>
          <label>
            Title shown under your name
            <select value={player.title ?? ''} onChange={e => setTitle(e.target.value || null)}>
              <option value="">None</option>
              {summary.badges.map(b => <option key={b.id} value={b.title}>{b.title}</option>)}
            </select>
          </label>
          <ul className="badge-list">
            {allBadges().map(b => (
              <li key={b.id} className={earned.has(b.id) ? 'earned' : 'locked'}>
                <b>{b.title}</b> <small className="muted">{b.description}</small>
              </li>
            ))}
          </ul>
        </>
      )}
      {showLoot && (
        <>
          <h3>HUD themes</h3>
          <div className="theme-grid">
            {THEMES.map(t => {
              const unlocked = summary.themes.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={`theme-swatch theme-${t.id} ${current === t.id ? 'picked' : ''}`}
                  disabled={!unlocked}
                  aria-pressed={current === t.id}
                  onClick={() => setTheme(t.id)}
                >
                  <span className="swatch" aria-hidden />
                  <span>{t.name}<br /><small>{unlocked ? (current === t.id ? 'Equipped' : 'Unlocked') : t.unlock}</small></span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </SystemWindow>
  )
}
