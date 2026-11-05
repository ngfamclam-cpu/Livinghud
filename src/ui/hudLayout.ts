import { useEffect, useState } from 'react'

// Which HUD panels show at the top, which tuck into "More", and which are
// hidden. Per device (localStorage), like the other display preferences.
// The Penalty Zone and alerts (surprise, recovery, bonds...) aren't listed:
// they only appear when something needs you, and always show on top.

export type PanelId = 'status' | 'dailies' | 'combo' | 'companion' | 'top3' | 'today' | 'money' | 'sides' | 'stats' | 'mains' | 'focus' | 'adventure' | 'journal' | 'collection' | 'rewards'
export type Placement = 'top' | 'more' | 'hidden'

export const PANEL_LABELS: Record<PanelId, string> = {
  status: 'Status, level and wallet',
  dailies: 'Daily quests',
  combo: 'Combo meter and chest',
  companion: 'Companion',
  top3: 'Top 3 goals',
  today: 'Today’s page (photo and journal)',
  money: 'Money tracker',
  sides: 'Side quests',
  stats: 'Stats',
  mains: 'Main quests',
  focus: 'Focus dungeon',
  adventure: 'Next adventure',
  journal: 'Journal',
  collection: 'Card collection',
  rewards: 'Rewards & Shadow Legion',
}

export interface HudLayout {
  order: PanelId[]
  place: Record<PanelId, Placement>
}

export const DEFAULT_LAYOUT: HudLayout = {
  order: ['status', 'dailies', 'combo', 'companion', 'top3', 'today', 'money', 'rewards', 'sides', 'stats', 'mains', 'focus', 'adventure', 'journal', 'collection'],
  place: {
    status: 'top', dailies: 'top', combo: 'top', companion: 'top', top3: 'top', today: 'top', money: 'top', rewards: 'more',
    sides: 'more', stats: 'more', mains: 'more', focus: 'more', adventure: 'more', journal: 'more', collection: 'more',
  },
}

const KEY = 'livinghud-hud-layout'
const listeners = new Set<() => void>()

/** Reads the saved layout, filling in any panel added since it was saved. */
export function loadLayout(): HudLayout {
  let saved: Partial<HudLayout> = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}
  } catch {
    saved = {}
  }
  const known = DEFAULT_LAYOUT.order
  const order = (Array.isArray(saved.order) ? saved.order : []).filter((id): id is PanelId => known.includes(id as PanelId))
  for (const id of known) if (!order.includes(id)) order.splice(Math.min(known.indexOf(id), order.length), 0, id)
  const place = { ...DEFAULT_LAYOUT.place }
  for (const id of known) {
    const p = saved.place?.[id]
    if (p === 'top' || p === 'more' || p === 'hidden') place[id] = p
  }
  return { order: [...new Set(order)], place }
}

export function saveLayout(layout: HudLayout | null) {
  try {
    if (layout) localStorage.setItem(KEY, JSON.stringify(layout))
    else localStorage.removeItem(KEY)
  } catch {
    // Private mode: the layout just won't stick.
  }
  listeners.forEach(f => f())
}

export function useHudLayout(): HudLayout {
  const [layout, setLayout] = useState(loadLayout)
  useEffect(() => {
    const update = () => setLayout(loadLayout())
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])
  return layout
}

/** Moves a panel one step up (-1) or down (+1) in the order. */
export function movePanel(layout: HudLayout, id: PanelId, step: -1 | 1): HudLayout {
  const order = [...layout.order]
  const i = order.indexOf(id)
  const j = i + step
  if (i < 0 || j < 0 || j >= order.length) return layout
  ;[order[i], order[j]] = [order[j], order[i]]
  return { ...layout, order }
}
