// Optional AI flavour text for bulk-imported loot cards. Off unless the
// project has an ANTHROPIC_API_KEY in Vercel; the app falls back to its free
// on-device captions whenever this isn't available. One small image per call
// (the app sends a ~512 px JPEG), and only for a save that exists, so a stray
// request can't run up a bill.
//
// POST /api/caption   header x-sync-key, body { image: <base64 JPEG> }
//   -> { name, text, rarity }   (rarity is a suggestion the app may ignore)
//   -> 503 { error: 'not-configured' } with no key; 422 { error: 'declined' } if the model won't caption it

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { blobStore, jsonResponse, normalizeKey, sha256, type Store } from '../server/blob.js'

const MAX_IMAGE_BYTES = 400_000
/** Vercel's environment variables (typed loosely: the API config has no Node types). */
const env = () => (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const Caption = z.object({
  name: z.string().min(1).max(40),
  text: z.string().min(1).max(140),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
})

const SYSTEM = `You name collectible cards for a personal RPG-style habit tracker. The player imports their own AI-generated or illustrated images and earns them as loot drops.
For the image, reply with only a JSON object: {"name": string (2-4 words, at most 40 characters), "text": string (one playful, flirty-but-tasteful flavour line, at most 140 characters), "rarity": "common" | "rare" | "epic" | "legendary"}.
Base the name and line on what is visible: mood, lighting, colours, setting, pose, outfit. Rarity reflects how striking and polished the image is. Never name or guess the identity of a real person. Keep everything non-explicit.`

export async function handle(request: Request, store: Store = blobStore, client?: Anthropic): Promise<Response> {
  if (request.method !== 'POST') return jsonResponse({ error: 'method' }, 405)
  const key = normalizeKey(request.headers.get('x-sync-key') ?? '')
  if (!key) return jsonResponse({ error: 'bad-key' }, 400)
  if (!client && !env().ANTHROPIC_API_KEY) return jsonResponse({ error: 'not-configured' }, 503)

  let image: string
  try {
    const body = (await request.json()) as { image?: unknown }
    if (typeof body.image !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(body.image)) return jsonResponse({ error: 'bad-image' }, 400)
    image = body.image
  } catch {
    return jsonResponse({ error: 'bad-image' }, 400)
  }
  if ((image.length * 3) / 4 > MAX_IMAGE_BYTES) return jsonResponse({ error: 'too-large' }, 413)

  // Only players with a real cloud save can use it.
  try {
    if (!(await store.read(`saves/${await sha256(key)}.json`))) return jsonResponse({ error: 'unknown-save' }, 403)
  } catch {
    return jsonResponse({ error: 'storage-error' }, 503)
  }

  const anthropic = client ?? new Anthropic()
  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: 'Name this card.' },
          ],
        },
      ],
    })
    if (response.stop_reason === 'refusal') return jsonResponse({ error: 'declined' }, 422)
    const text = response.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    const parsed = json ? Caption.safeParse(JSON.parse(json)) : null
    if (!parsed?.success) return jsonResponse({ error: 'bad-answer' }, 502)
    return jsonResponse(parsed.data)
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return jsonResponse({ error: 'busy' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return jsonResponse({ error: 'not-configured' }, 503)
    if (e instanceof SyntaxError) return jsonResponse({ error: 'bad-answer' }, 502)
    return jsonResponse({ error: 'ai-error' }, 502)
  }
}

export const POST = (request: Request) => handle(request)
