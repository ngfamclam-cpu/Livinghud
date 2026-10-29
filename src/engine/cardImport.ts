// Bulk card import: turn your own images into loot cards. Pure maths only, so
// it can be tested: where to crop, how good an image looks, how rarity is spread
// across a batch, and a playful name and flavour line from what the image shows.
// The browser side (decoding, the pose model, canvases) lives in src/ui/loot.

import type { Rarity } from './loot'

/** Cards are 5:7, width over height. */
export const CARD_ASPECT = 5 / 7

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** The biggest 5:7 rectangle that fits in the image. */
export function largestCardRect(imgW: number, imgH: number): { w: number; h: number } {
  return imgW / imgH > CARD_ASPECT ? { w: imgH * CARD_ASPECT, h: imgH } : { w: imgW, h: imgW / CARD_ASPECT }
}

/** Never crop tighter than this share of the largest card rectangle, so the photo keeps its context. */
export const MIN_CROP_SHARE = 0.6

/**
 * Where to crop an image for a card. With a person found (their box in pixels),
 * the crop wraps them with breathing room, more above the head than below, and
 * zooms in only as far as MIN_CROP_SHARE: a full-body shot keeps the whole
 * body, a distant figure is brought closer without losing the scene. With no
 * one found, it takes the largest card rectangle, a little above centre.
 */
export function cardCrop(imgW: number, imgH: number, person: Rect | null): Rect {
  const max = largestCardRect(imgW, imgH)
  const clamp = (r: Rect): Rect => ({
    w: r.w,
    h: r.h,
    x: Math.max(0, Math.min(imgW - r.w, r.x)),
    y: Math.max(0, Math.min(imgH - r.h, r.y)),
  })
  if (!person || person.w <= 0 || person.h <= 0) {
    return clamp({ ...max, x: (imgW - max.w) / 2, y: (imgH - max.h) * 0.3 })
  }
  // Breathing room: 18% above the head, 8% below the feet, 15% each side.
  const padded: Rect = {
    x: person.x - person.w * 0.15,
    y: person.y - person.h * 0.18,
    w: person.w * 1.3,
    h: person.h * 1.26,
  }
  // The smallest 5:7 box around the padded person, between the floor and the largest.
  let h = Math.max(padded.h, padded.w / CARD_ASPECT)
  h = Math.min(max.h, Math.max(max.h * MIN_CROP_SHARE, h))
  const w = h * CARD_ASPECT
  const cx = padded.x + padded.w / 2
  const cy = padded.y + padded.h / 2
  return clamp({ x: cx - w / 2, y: cy - h / 2, w, h })
}

/** Zoom (1 = the auto crop, up to 2.5×) and pan a crop, staying inside the image and the card shape. */
export function adjustCrop(base: Rect, imgW: number, imgH: number, zoom: number, dx: number, dy: number): Rect {
  const max = largestCardRect(imgW, imgH)
  const z = Math.max(0.4, Math.min(2.5, zoom))
  const h = Math.min(max.h, base.h / z)
  const w = h * CARD_ASPECT
  const cx = base.x + base.w / 2 + dx
  const cy = base.y + base.h / 2 + dy
  return {
    w,
    h,
    x: Math.max(0, Math.min(imgW - w, cx - w / 2)),
    y: Math.max(0, Math.min(imgH - h, cy - h / 2)),
  }
}

export interface ImageStats {
  /** 0-1 average brightness. */
  brightness: number
  /** Spread of brightness (0-~0.5). */
  contrast: number
  /** Edge detail: variance of the Laplacian on a 0-255 scale. */
  sharpness: number
  /** Hasler-Süsstrunk colourfulness (0 grey to ~100+ vivid). */
  colorfulness: number
  /** Average red minus blue, -1 cool to 1 warm. */
  warmth: number
  /** Most common strong hue in degrees, or null for a mostly grey image. */
  hue: number | null
}

/** Measures a small RGBA copy of an image (a canvas's getImageData output). */
export function imageStats(data: ArrayLike<number>, w: number, h: number): ImageStats {
  const n = w * h
  const lum = new Float32Array(n)
  let sum = 0
  let warm = 0
  let rgSum = 0
  let ybSum = 0
  let rgSq = 0
  let ybSq = 0
  const hues = new Float32Array(12)
  for (let i = 0; i < n; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    lum[i] = l
    sum += l
    warm += (r - b) / 255
    const rg = r - g
    const yb = 0.5 * (r + g) - b
    rgSum += rg
    ybSum += yb
    rgSq += rg * rg
    ybSq += yb * yb
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    if (sat > 0.35 && max > 60) {
      let hue: number
      if (max === r) hue = ((g - b) / (max - min)) % 6
      else if (max === g) hue = (b - r) / (max - min) + 2
      else hue = (r - g) / (max - min) + 4
      hues[Math.floor((((hue * 60) % 360) + 360) % 360 / 30)] += sat
    }
  }
  const mean = sum / n
  let varSum = 0
  for (let i = 0; i < n; i++) varSum += (lum[i] - mean) ** 2
  // Laplacian (4-neighbour) variance, on 0-255 brightness.
  let lapSum = 0
  let lapSq = 0
  let lapN = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const v = 255 * (lum[i - 1] + lum[i + 1] + lum[i - w] + lum[i + w] - 4 * lum[i])
      lapSum += v
      lapSq += v * v
      lapN++
    }
  }
  const lapMean = lapN ? lapSum / lapN : 0
  const rgMean = rgSum / n
  const ybMean = ybSum / n
  const rgStd = Math.sqrt(Math.max(0, rgSq / n - rgMean ** 2))
  const ybStd = Math.sqrt(Math.max(0, ybSq / n - ybMean ** 2))
  let best = -1
  let bestWeight = n * 0.04 // at least ~4% strongly coloured pixels to call a hue
  for (let i = 0; i < 12; i++) {
    if (hues[i] > bestWeight) {
      best = i
      bestWeight = hues[i]
    }
  }
  return {
    brightness: mean,
    contrast: Math.sqrt(varSum / n),
    sharpness: lapN ? lapSq / lapN - lapMean ** 2 : 0,
    colorfulness: Math.sqrt(rgStd ** 2 + ybStd ** 2) + 0.3 * Math.sqrt(rgMean ** 2 + ybMean ** 2),
    warmth: Math.max(-1, Math.min(1, warm / n)),
    hue: best < 0 ? null : best * 30 + 15,
  }
}

/** 0-1: how good an image looks as a card (sharp, punchy, colourful, well exposed, big enough). */
export function qualityScore(s: ImageStats, imgW: number, imgH: number, personFound: boolean): number {
  const sharp = Math.min(1, s.sharpness / 600)
  const contrast = Math.min(1, s.contrast / 0.25)
  const colour = Math.min(1, s.colorfulness / 80)
  const exposure = Math.max(0, 1 - Math.abs(s.brightness - 0.5) * 2)
  const resolution = Math.min(1, Math.min(imgW, imgH) / 1200)
  const score = 0.3 * sharp + 0.2 * contrast + 0.2 * colour + 0.15 * exposure + 0.15 * resolution + (personFound ? 0.05 : 0)
  return Math.min(1, score)
}

/**
 * Spreads rarity across a batch by score: the best ~10% Legendary, the next
 * 20% Epic, 35% Rare, the rest Common. Returns rarities in the input order.
 */
export function rarityByRank(scores: number[]): Rarity[] {
  const order = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s)
  const out: Rarity[] = new Array(scores.length)
  order.forEach(({ i }, rank) => {
    const share = rank / scores.length
    out[i] = share < 0.1 ? 'legendary' : share < 0.3 ? 'epic' : share < 0.65 ? 'rare' : 'common'
  })
  return out
}

/** What the pose model saw, if anything (positions as shares of the image). */
export interface PoseHint {
  /** Both wrists above the nose. */
  armsUp: boolean
  /** Shoulders tilted (a lean or a sway). */
  leaning: boolean
  /** The person fills most of the frame top to bottom (a close-up). */
  closeUp: boolean
  /** Feet visible (a full-body shot). */
  fullBody: boolean
}

const COLOURS: { from: number; to: number; word: string }[] = [
  { from: 0, to: 20, word: 'Crimson' },
  { from: 20, to: 45, word: 'Sunset' },
  { from: 45, to: 70, word: 'Golden' },
  { from: 70, to: 160, word: 'Jade' },
  { from: 160, to: 200, word: 'Aqua' },
  { from: 200, to: 250, word: 'Sapphire' },
  { from: 250, to: 290, word: 'Violet' },
  { from: 290, to: 340, word: 'Neon Rose' },
  { from: 340, to: 361, word: 'Crimson' },
]
const NOUNS = ['Muse', 'Siren', 'Starlet', 'Encore', 'Mirage', 'Spark', 'Reverie', 'Rush', 'Bloom', 'Icon', 'Heartbreaker', 'Showstopper']

function seeded(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995)
    h ^= h >>> 15
    return (h >>> 0) / 4294967296
  }
}

/** A name and flavour line from what the image shows. Same image, same words. */
export function autoCaption(s: ImageStats, pose: PoseHint | null, seed: string): { name: string; text: string } {
  const rnd = seeded(seed)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const colour = s.hue === null ? null : COLOURS.find(c => s.hue! >= c.from && s.hue! < c.to)?.word ?? null
  const mood =
    s.brightness < 0.3 ? pick(['Midnight', 'After Dark', 'Moonlit']) :
    s.warmth > 0.12 && s.brightness < 0.7 ? 'Golden Hour' :
    s.colorfulness > 70 ? 'Neon' :
    s.brightness > 0.72 ? pick(['Daylight', 'Sunlit']) :
    null
  const lead = rnd() < 0.5 ? (mood ?? colour) : (colour ?? mood)
  const name = `${lead ?? pick(['Velvet', 'Electric', 'Silver', 'Wild'])} ${pick(NOUNS)}`

  const lines: string[] = []
  if (pose?.armsUp) lines.push('Arms up for the final chorus. The whole room follows.', 'Hands in the air like the bass just dropped.')
  if (pose?.leaning) lines.push('One lean and the camera forgot everyone else.', 'Strikes a pose like she owns the night.')
  if (pose?.closeUp) lines.push('That look could start a fan club.', 'Eye contact rated legendary.')
  if (pose?.fullBody) lines.push('Head-to-toe main character energy.', 'The outfit alone deserves its own card.')
  if (s.brightness < 0.3) lines.push('Lit only by city lights and confidence.', 'The night is young and so is the playlist.')
  else if (s.warmth > 0.12) lines.push('Caught in the golden hour. Pure warmth.', 'Sun-kissed and dangerous.')
  if (s.colorfulness > 70) lines.push('More colour than the whole festival lineup.', 'Neon looks better on her.')
  lines.push('Earned, not given. Keep clearing quests.', 'A rare find for a hunter on the rise.', 'Worth every rep.')
  return { name, text: pick(lines) }
}
