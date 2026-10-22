// Auto-complete links. Automation apps (MacroDroid, Tasker), NFC tags or a
// bookmark open a quest's private link; the completion waits in an inbox until
// LivingHUD next opens, then counts for the moment the link was opened.
//
// GET  /api/trigger?t=TOKEN&q=QUEST_ID[&v=min]  queue a quest completion
// GET  /api/trigger?t=TOKEN&x=EXERCISE[&n=1]    queue logged exercise (e.g. a posture check-in)
// GET  /api/trigger?t=TOKEN&inbox=1             list waiting completions (the app)
// POST /api/trigger?t=TOKEN&ack=1  {ids: [...]} remove handled completions (the app)
//
// The inbox is one small file per player, updated with version checks so two
// writes at the same moment can't lose each other. Only a hash of the token is stored.

import { blobStore, jsonResponse, normalizeKey, sha256, storageError, type Store } from '../server/blob'

export interface InboxItem {
  id: string
  /** A quest to clear... */
  questId?: string
  version?: 'full' | 'min'
  /** ...or exercise to log. */
  exercise?: string
  amount?: number
  /** When the link was opened, in milliseconds. */
  at: number
}

const MAX_ITEMS = 200
const RETRIES = 5

export async function handle(request: Request, store: Store = blobStore, now = Date.now()): Promise<Response> {
  const url = new URL(request.url)
  const token = normalizeKey(url.searchParams.get('t') ?? '')
  if (!token) return jsonResponse({ error: 'bad-link', message: 'This link is incomplete. Copy it again from LivingHUD Settings.' }, 400)
  const path = `inbox/${await sha256(token)}.json`

  try {
    if (request.method === 'GET' && url.searchParams.has('inbox')) {
      const stored = await store.read(path)
      return jsonResponse({ items: stored ? parse(stored.body) : [] })
    }

    if (request.method === 'POST' && url.searchParams.has('ack')) {
      const { ids } = (await request.json().catch(() => ({}))) as { ids?: unknown }
      if (!Array.isArray(ids)) return jsonResponse({ error: 'bad-request' }, 400)
      const done = new Set(ids)
      const ok = await update(store, path, items => items.filter(i => !done.has(i.id)))
      return ok ? jsonResponse({ ok: true }) : jsonResponse({ error: 'busy' }, 503)
    }

    if (request.method === 'GET' || request.method === 'POST') {
      const id = /^[A-Za-z0-9-]{1,64}$/
      const questId = url.searchParams.get('q') ?? ''
      const exercise = url.searchParams.get('x') ?? ''
      const amount = Math.round(Number(url.searchParams.get('n') ?? 1))
      let item: InboxItem
      if (id.test(questId)) {
        item = { id: crypto.randomUUID(), questId, version: url.searchParams.get('v') === 'min' ? 'min' : 'full', at: now }
      } else if (id.test(exercise) && amount >= 1 && amount <= 10_000) {
        item = { id: crypto.randomUUID(), exercise, amount, at: now }
      } else {
        return jsonResponse({ error: 'bad-link', message: 'This link has no quest or exercise in it.' }, 400)
      }
      const ok = await update(store, path, items => [...items, item].slice(-MAX_ITEMS))
      return ok
        ? jsonResponse({ ok: true, message: 'Sent to LivingHUD. It shows the next time the app is open.' })
        : jsonResponse({ error: 'busy', message: 'Busy, try again.' }, 503)
    }

    return jsonResponse({ error: 'method' }, 405)
  } catch (e) {
    return storageError(e)
  }
}

/** Read, change, write back only if nobody else wrote in between; retry if they did. */
async function update(store: Store, path: string, change: (items: InboxItem[]) => InboxItem[]): Promise<boolean> {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    const stored = await store.read(path)
    const next = change(stored ? parse(stored.body) : [])
    if (await store.writeIf(path, JSON.stringify({ items: next }), stored?.etag ?? null)) return true
  }
  return false
}

function parse(body: string): InboxItem[] {
  try {
    const items = JSON.parse(body)?.items
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

export const GET = (request: Request) => handle(request)
export const POST = (request: Request) => handle(request)
