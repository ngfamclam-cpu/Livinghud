import type { RewardSpecial } from '../engine'

export const money = (n: number) => `$${n.toFixed(2)}`

export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long' })
}

export const SPECIAL_LABEL: Record<RewardSpecial, string> = {
  none: 'Normal',
  date: 'Date: also earns CHA XP',
  bigNight: 'Big night: grants a Recovery Day',
}
