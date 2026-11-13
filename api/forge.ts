// Pack Forge: makes one card image with Cloudflare Workers AI (FLUX.1 schnell,
// free daily allowance). Only cards from the app's own catalog can be made, and
// only for a sync code that has a cloud save, so the endpoint can't be used to
// generate arbitrary images. The app calls it once per card.
//
// POST /api/forge   header x-sync-key, body { cardId: "rave-3", variant: 0-9999 }
//                   or { companionId: "mina", outfitId: "knit", variant } for a companion portrait
//                   or { funnyId: "fun-3", variant } (a funny pack card), { soldierKind: "Mage", veteran, variant }
//                   or { petId: "ember-fox", level: 1-6, variant } (AI looks, src/engine/looks.ts)
//   -> { image: <base64 JPEG> }
//   -> 503 { error: 'not-configured' } without CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN
//   -> 429 { error: 'limit' } when today's free allowance is used up
//   -> 422 { error: 'declined' } when the NSFW filter refuses it even with softer wording

import { blobStore, jsonResponse, normalizeKey, sha256, type Store } from '../server/blob.js'
import { FORGE_STEPS, MAX_VARIANT, companionPrompt, forgeCard, forgePrompt, humanCompanion, type ForgeLevel } from '../src/engine/forge.js'
import { funnyCard, funnyPrompt, petPrompt, soldierPrompt } from '../src/engine/looks.js'

const MODEL = '@cf/black-forest-labs/flux-1-schnell'
const env = () => (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

export async function handle(request: Request, store: Store = blobStore, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return jsonResponse({ error: 'method' }, 405)
  const key = normalizeKey(request.headers.get('x-sync-key') ?? '')
  if (!key) return jsonResponse({ error: 'bad-key' }, 400)
  const account = env().CLOUDFLARE_ACCOUNT_ID?.trim()
  const token = env().CLOUDFLARE_API_TOKEN?.trim()
  if (!account || !token) return jsonResponse({ error: 'not-configured' }, 503)

  const body = (await request.json().catch(() => ({}))) as { cardId?: unknown; variant?: unknown; companionId?: unknown; outfitId?: unknown; funnyId?: unknown; soldierKind?: unknown; veteran?: unknown; petId?: unknown; level?: unknown }
  const variant = body.variant === undefined ? 0 : Number(body.variant)
  if (!Number.isInteger(variant) || variant < 0 || variant > MAX_VARIANT) return jsonResponse({ error: 'bad-variant' }, 400)
  // A card from the catalog, or a companion's outfit portrait. Nothing else can be made.
  let promptFor: ((level: ForgeLevel) => string) | null = null
  if (typeof body.funnyId === 'string') {
    const card = funnyCard(body.funnyId)
    if (card) promptFor = () => funnyPrompt(card, variant)
  } else if (typeof body.soldierKind === 'string') {
    const prompt = soldierPrompt(body.soldierKind, variant, body.veteran === true)
    if (prompt) promptFor = () => prompt
  } else if (typeof body.petId === 'string') {
    const prompt = petPrompt(body.petId, Number(body.level) || 1, variant)
    if (prompt) promptFor = () => prompt
  } else if (typeof body.companionId === 'string') {
    const companion = humanCompanion(body.companionId)
    const outfitId = typeof body.outfitId === 'string' ? body.outfitId : ''
    if (companion && companionPrompt(companion, outfitId, variant)) promptFor = level => companionPrompt(companion, outfitId, variant, level)!
  } else {
    const card = typeof body.cardId === 'string' ? forgeCard(body.cardId) : undefined
    if (card) promptFor = level => forgePrompt(card, variant, level)
  }
  if (!promptFor) return jsonResponse({ error: 'unknown-card' }, 400)

  try {
    if (!(await store.read(`saves/${await sha256(key)}.json`))) return jsonResponse({ error: 'unknown-save' }, 403)
  } catch {
    return jsonResponse({ error: 'storage-error' }, 503)
  }

  // Full wording first; if Cloudflare's filter refuses it, once more with softer words.
  for (const level of [0, 1] as const) {
    let res: Response
    try {
      res = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${MODEL}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: promptFor(level), steps: FORGE_STEPS }),
      })
    } catch {
      return jsonResponse({ error: 'ai-error' }, 502)
    }
    const data = (await res.json().catch(() => null)) as { success?: boolean; result?: { image?: string }; errors?: { code?: number; message?: string }[] } | null
    const message = (data?.errors ?? []).map(e => `${e.code ?? ''} ${e.message ?? ''}`).join('; ')
    if (res.status === 401 || res.status === 403) return jsonResponse({ error: 'not-configured', message }, 503)
    if (/nsfw/i.test(message)) {
      if (level === 0) continue
      return jsonResponse({ error: 'declined', message }, 422)
    }
    if (res.status === 429 || /daily|allocation|quota|limit/i.test(message)) return jsonResponse({ error: 'limit', message }, 429)
    const image = data?.result?.image
    if (!res.ok || !image) return jsonResponse({ error: 'ai-error', message: message || `status ${res.status}` }, 502)
    return jsonResponse({ image, softer: level === 1 })
  }
  return jsonResponse({ error: 'declined' }, 422)
}

export const POST = (request: Request) => handle(request)
