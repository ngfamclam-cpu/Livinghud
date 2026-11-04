import { useState } from 'react'
import { DEFAULT_LAYOUT, PANEL_LABELS, loadLayout, movePanel, saveLayout, type HudLayout, type Placement } from './hudLayout'
import { SystemWindow } from './SystemWindow'

export interface MoreItem {
  key: string
  label: string
  hint: string
  open: () => void
}

/** The "More" tab: everything that isn't a daily screen, one tap away. */
export function MoreMenu({ items }: { items: MoreItem[] }) {
  return (
    <main className="hud">
      <SystemWindow title="More">
        <ul className="menu-grid">
          {items.map(i => (
            <li key={i.key}>
              <button className="ghost" onClick={i.open}>
                <b>{i.label}</b>
                <small>{i.hint}</small>
              </button>
            </li>
          ))}
        </ul>
      </SystemWindow>
    </main>
  )
}

const PLACES: { key: Placement; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'more', label: 'More' },
  { key: 'hidden', label: 'Hide' },
]

/** Pick which HUD panels sit on top, fold into "More", or hide. Saved on this device. */
export function CustomizeHud({ onClose }: { onClose: () => void }) {
  const [layout, setLayout] = useState<HudLayout>(loadLayout)
  const update = (next: HudLayout) => {
    setLayout(next)
    saveLayout(next)
  }
  return (
    <main className="hud">
      <div className="row end"><button className="ghost small" onClick={onClose}>Back</button></div>
      <SystemWindow title="Customize HUD">
        <p className="muted">
          <b>Top</b> shows straight away, <b>More</b> folds into a tap-to-open section at the bottom, <b>Hide</b> removes it from the HUD (nothing is deleted).
          Alerts like the Penalty Zone, surprises and Recovery Days always show on top. Saved on this device only.
        </p>
        <ul className="layout-list">
          {layout.order.map((id, i) => (
            <li key={id}>
              <span className="grow">{PANEL_LABELS[id]}</span>
              <button className="ghost small icon" aria-label={`Move ${PANEL_LABELS[id]} up`} disabled={i === 0} onClick={() => update(movePanel(layout, id, -1))}>↑</button>
              <button className="ghost small icon" aria-label={`Move ${PANEL_LABELS[id]} down`} disabled={i === layout.order.length - 1} onClick={() => update(movePanel(layout, id, 1))}>↓</button>
              <span className="seg" role="group" aria-label={`Where ${PANEL_LABELS[id]} shows`}>
                {PLACES.map(p => (
                  <button key={p.key} className={layout.place[id] === p.key ? 'on' : ''} aria-pressed={layout.place[id] === p.key} onClick={() => update({ ...layout, place: { ...layout.place, [id]: p.key } })}>
                    {p.label}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="row end">
          <button className="ghost small" onClick={() => { saveLayout(null); setLayout(DEFAULT_LAYOUT) }}>Reset to default</button>
        </div>
      </SystemWindow>
    </main>
  )
}
