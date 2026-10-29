import { describe, expect, it } from 'vitest'
import { CARD_ASPECT, MIN_CROP_SHARE, adjustCrop, autoCaption, cardCrop, imageStats, largestCardRect, qualityScore, rarityByRank } from './index'

const aspect = (r: { w: number; h: number }) => r.w / r.h
const inside = (r: { x: number; y: number; w: number; h: number }, W: number, H: number) =>
  r.x >= -0.001 && r.y >= -0.001 && r.x + r.w <= W + 0.001 && r.y + r.h <= H + 0.001

describe('card crop', () => {
  it('takes the largest card shape, a bit above centre, when no one is found', () => {
    const r = cardCrop(1600, 900, null)
    expect(aspect(r)).toBeCloseTo(CARD_ASPECT)
    expect(r.h).toBeCloseTo(900)
    expect(r.x).toBeCloseTo((1600 - r.w) / 2)
    expect(inside(r, 1600, 900)).toBe(true)
  })

  it('wraps a full-body person without cutting them off', () => {
    const person = { x: 400, y: 100, w: 200, h: 700 } // tall figure in a 1000 × 1000 image
    const r = cardCrop(1000, 1000, person)
    expect(aspect(r)).toBeCloseTo(CARD_ASPECT)
    expect(inside(r, 1000, 1000)).toBe(true)
    expect(r.y).toBeLessThanOrEqual(person.y)
    expect(r.y + r.h).toBeGreaterThanOrEqual(person.y + person.h)
  })

  it('zooms toward a small, distant person but keeps the scene', () => {
    const r = cardCrop(2000, 2000, { x: 950, y: 900, w: 60, h: 160 })
    const max = largestCardRect(2000, 2000)
    expect(r.h).toBeCloseTo(max.h * MIN_CROP_SHARE)
    expect(r.x).toBeLessThan(950)
    expect(r.x + r.w).toBeGreaterThan(1010)
  })

  it('zooms and pans within the image', () => {
    const base = cardCrop(1000, 1400, null)
    const z = adjustCrop(base, 1000, 1400, 2, 5000, 0)
    expect(z.h).toBeCloseTo(base.h / 2)
    expect(aspect(z)).toBeCloseTo(CARD_ASPECT)
    expect(z.x + z.w).toBeCloseTo(1000) // pushed to the right edge, not past it
  })
})

/** A w × h RGBA buffer filled by a pixel function. */
function img(w: number, h: number, px: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = px(x, y)
    data.set([r, g, b, 255], (y * w + x) * 4)
  }
  return data
}

describe('image stats and quality', () => {
  it('scores a sharp, colourful image above a flat grey one', () => {
    const grey = imageStats(img(64, 64, () => [128, 128, 128]), 64, 64)
    const vivid = imageStats(img(64, 64, (x, y) => ((x + y) % 2 ? [255, 40, 120] : [20, 200, 255])), 64, 64)
    expect(grey.hue).toBeNull()
    expect(grey.sharpness).toBe(0)
    expect(vivid.sharpness).toBeGreaterThan(grey.sharpness)
    expect(vivid.colorfulness).toBeGreaterThan(grey.colorfulness)
    expect(qualityScore(vivid, 1600, 1600, true)).toBeGreaterThan(qualityScore(grey, 1600, 1600, false))
  })

  it('spots a dominant hue and night shots', () => {
    const red = imageStats(img(32, 32, () => [220, 30, 30]), 32, 32)
    expect(red.hue).toBeLessThan(30)
    const dark = imageStats(img(32, 32, () => [20, 20, 30]), 32, 32)
    expect(dark.brightness).toBeLessThan(0.3)
    expect(autoCaption(dark, null, 'x').name).toMatch(/Midnight|After Dark|Moonlit|Sapphire|Velvet|Electric|Silver|Wild/)
  })
})

describe('rarity spread', () => {
  it('gives the best 10% Legendary, then Epic, Rare and Common', () => {
    const scores = Array.from({ length: 20 }, (_, i) => i / 20)
    const r = rarityByRank(scores)
    const count = (x: string) => r.filter(v => v === x).length
    expect([count('legendary'), count('epic'), count('rare'), count('common')]).toEqual([2, 4, 7, 7])
    expect(r[19]).toBe('legendary') // the highest score
    expect(r[0]).toBe('common')
  })
})

describe('auto caption', () => {
  it('is stable for the same image and uses the pose', () => {
    const s = imageStats(img(16, 16, () => [200, 120, 40]), 16, 16)
    const pose = { armsUp: true, leaning: false, closeUp: false, fullBody: false }
    expect(autoCaption(s, pose, 'a')).toEqual(autoCaption(s, pose, 'a'))
    const texts = new Set(Array.from({ length: 30 }, (_, i) => autoCaption(s, pose, `seed${i}`).text))
    expect([...texts].some(t => /Arms up|Hands in the air/.test(t))).toBe(true)
  })
})
