const pad = (n: number) => String(n).padStart(2, '0')

/** The game day a moment belongs to. Before resetHour it still counts as the previous day. */
export function dayKey(date: Date, resetHour: number): string {
  const shifted = new Date(date.getTime() - resetHour * 3_600_000)
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`
}

/** YYYY-MM for a game day key. */
export function monthOf(day: string): string {
  return day.slice(0, 7)
}

/** Shift a YYYY-MM-DD key by whole days. */
export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d + delta)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Whole days from a to b (b later = positive). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** The Monday that starts the week a day belongs to. Side quests reset weekly. */
export function weekOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7 // Monday = 0
  return addDays(day, -weekday)
}
