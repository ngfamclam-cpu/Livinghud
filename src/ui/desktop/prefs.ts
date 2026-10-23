import { useEffect, useState, useSyncExternalStore } from 'react'

// Per-device choices for the PC dashboard. They live in localStorage because
// they belong to this screen, not to the player (a phone and a PC can differ).

export type Look = 'system' | 'clean'
export type Layout = 'auto' | 'phone'

interface Prefs {
  look: Look
  layout: Layout
  notify: boolean
}

const KEY = 'livinghud-desktop'
const DEFAULTS: Prefs = { look: 'system', layout: 'auto', notify: false }
const listeners = new Set<() => void>()

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

let current = read()

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  current = { ...current, [key]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Private window: the choice lasts until the tab closes.
  }
  listeners.forEach(l => l())
}

export const getPrefs = () => current

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

/** The dashboard needs room: a PC or laptop window at least this wide. */
const WIDE = '(min-width: 1100px)'

export function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE)
    if (!mq) return
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}
