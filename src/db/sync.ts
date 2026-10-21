// Cloud sync through this app's own Vercel function (api/sync.ts).
// The browser database stays the working copy, so the app is fast and works
// offline. A few seconds after any change the whole save is uploaded; when the
// app opens or comes back to the front it checks for a newer copy from another
// device. If both devices changed, the device that changed last wins.

import { liveQuery } from 'dexie'
import { importSave, SAVE_TABLES, saveData } from './actions'

const KEY_STORE = 'livinghud-sync-key'
/** Fingerprint of the save this device last agreed on with the cloud. */
const AGREED_STORE = 'livinghud-sync-agreed'
const PUSH_DELAY_MS = 1500
const ENDPOINT = '/api/sync'

/** localStorage can be blocked (private windows); sync then simply stays off. */
const storage = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  },
  remove(k: string) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

export type SyncState = 'off' | 'syncing' | 'synced' | 'offline' | 'not-configured' | 'unavailable'

export interface SyncStatus {
  state: SyncState
  /** The secret code that links devices to this save, formatted for reading. */
  code: string | null
  lastSyncedAt: number | null
}

let status: SyncStatus = { state: 'off', code: formatCode(storage.get(KEY_STORE)), lastSyncedAt: null }
const listeners = new Set<() => void>()

export const getSyncStatus = () => status
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  for (const l of listeners) l()
}

type SaveData = Awaited<ReturnType<typeof saveData>>

let started = false
let pushTimer: ReturnType<typeof setTimeout> | undefined
/** Runs sync steps one at a time so a pull and a push never overlap. */
let queue: Promise<void> = Promise.resolve()
function enqueue(step: () => Promise<void>): Promise<void> {
  const run = queue.then(() => step())
  queue = run.catch(() => {})
  return run
}
/** A sync step nobody waits on: a failure just shows as offline. */
const background = (step: () => Promise<void>) => void enqueue(step).catch(() => setStatus({ state: 'offline' }))

export function startSync(): void {
  if (started) return
  started = true

  // Every change to the game data lands here, including the very first load.
  liveQuery(saveData).subscribe({
    next: data => {
      if (data.players.length === 0) return // never upload an empty game
      if (!storage.get(KEY_STORE)) setKey(newCode()) // sync turns on by itself once you have a character
      if (fingerprint(data) === storage.get(AGREED_STORE)) return
      clearTimeout(pushTimer)
      pushTimer = setTimeout(() => background(push), PUSH_DELAY_MS)
    },
  })

  background(pull)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') background(pull)
    // Leaving the app: upload a pending change now instead of waiting.
    else if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = undefined
      background(() => push(true))
    }
  })
  window.addEventListener('online', () => background(pull))
}

/** Links this device to the save behind a sync code, replacing what is on this device. */
export async function linkDevice(code: string): Promise<void> {
  const key = normalize(code)
  if (!key) throw new Error('That doesn’t look like a sync code. It has 25 letters and numbers.')
  const res = await request('GET', key)
  if (res.kind === 'missing') throw new Error('No save was found for that code. Check it and try again.')
  if (res.kind !== 'ok') throw new Error(problem(res.kind))
  await enqueue(async () => {
    setKey(key)
    await adopt(res.text)
  })
}

/** Forgets this device's sync code, e.g. before starting a new character. The cloud copy stays. */
export function forgetSync(): void {
  clearTimeout(pushTimer)
  storage.remove(KEY_STORE)
  storage.remove(AGREED_STORE)
  setStatus({ state: 'off', code: null, lastSyncedAt: null })
}

async function pull(): Promise<void> {
  const key = storage.get(KEY_STORE)
  if (!key) return
  setStatus({ state: 'syncing' })
  const res = await request('GET', key)
  const local = await saveData()
  if (res.kind === 'missing') return local.players.length > 0 ? push() : setStatus({ state: 'synced' })
  if (res.kind !== 'ok') return setStatus({ state: res.kind })

  const remote = JSON.parse(res.text)
  const localPrint = fingerprint(local)
  const agreed = storage.get(AGREED_STORE)
  if (fingerprint(remote) === localPrint) {
    storage.set(AGREED_STORE, localPrint)
    setStatus({ state: 'synced', lastSyncedAt: Date.now() })
  } else if (local.players.length === 0 || localPrint === agreed) {
    // Nothing new on this device, so take the newer copy from the cloud.
    await adopt(res.text)
  } else {
    // This device has changes the cloud hasn't seen: this device wins.
    await push()
  }
}

async function push(leaving = false): Promise<void> {
  pushTimer = undefined
  const key = storage.get(KEY_STORE)
  const data = await saveData()
  if (!key || data.players.length === 0) return
  setStatus({ state: 'syncing' })
  const res = await request('PUT', key, JSON.stringify({ ...data, exportedAt: Date.now() }), leaving)
  if (res.kind !== 'ok') return setStatus({ state: res.kind === 'missing' ? 'unavailable' : res.kind })
  storage.set(AGREED_STORE, fingerprint(data))
  setStatus({ state: 'synced', lastSyncedAt: Date.now() })
}

/** Replaces this device's game with a save from the cloud. */
async function adopt(text: string): Promise<void> {
  // Agree first, so the database change that follows isn't uploaded straight back.
  storage.set(AGREED_STORE, fingerprint(JSON.parse(text)))
  await importSave(text)
  setStatus({ state: 'synced', lastSyncedAt: Date.now() })
}

type Result = { kind: 'ok'; text: string } | { kind: 'missing' } | { kind: 'offline' | 'not-configured' | 'unavailable' }

async function request(method: 'GET' | 'PUT', key: string, body?: string, keepalive = false): Promise<Result> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method,
      body,
      keepalive: keepalive && (body?.length ?? 0) < 60_000,
      headers: { 'x-sync-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
      cache: 'no-store',
    })
  } catch {
    return { kind: 'offline' }
  }
  // Without the Vercel function (e.g. `npm run dev`) the app gets its own page back instead of JSON.
  if (!res.headers.get('content-type')?.includes('application/json')) return { kind: 'unavailable' }
  if (res.status === 404) return { kind: 'missing' }
  if (res.status === 503) {
    const { error } = await res.json().catch(() => ({ error: '' }))
    return { kind: error === 'not-configured' ? 'not-configured' : 'offline' }
  }
  if (!res.ok) return { kind: 'unavailable' }
  return { kind: 'ok', text: await res.text() }
}

function problem(kind: SyncState): string {
  if (kind === 'not-configured') return 'Cloud storage isn’t connected to this app in Vercel yet.'
  if (kind === 'offline') return 'Can’t reach the cloud right now. Check your connection.'
  return 'Cloud sync isn’t available here.'
}

function setKey(key: string) {
  storage.set(KEY_STORE, key)
  setStatus({ code: formatCode(key) })
}

/** The same game always gives the same fingerprint, wherever it was saved. */
function fingerprint(data: Partial<SaveData>): string {
  const text = JSON.stringify(SAVE_TABLES.map(t => data[t] ?? []))
  // cyrb53: a fast, well-spread 53-bit string hash.
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${text.length}:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`
}

// No 0/O or 1/I, so a code copied by hand can't be misread. 25 characters is about 125 bits.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(25)), b => ALPHABET[b % ALPHABET.length]).join('')
}

function normalize(code: string): string | null {
  const key = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return key.length === 25 ? key : null
}

function formatCode(key: string | null): string | null {
  return key ? key.match(/.{1,5}/g)!.join('-') : null
}
