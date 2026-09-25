/** PokéAPI sends height in decimetres and weight in hectograms: both are tenths of the display unit. */
export function tenthsToUnit(value: number): number {
  return value / 10
}

// The largest base stat in the games is 255 (Blissey's HP); bars are scaled against it.
const MAX_BASE_STAT = 255

export function statPercent(baseStat: number): number {
  return Math.min(100, Math.round((baseStat / MAX_BASE_STAT) * 100))
}

/** Only `location.state` set by our own list links is trusted, and only if it is a query string. */
export function readBackSearch(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return ''
  const { from } = state
  return typeof from === 'string' && from.startsWith('?') ? from : ''
}
