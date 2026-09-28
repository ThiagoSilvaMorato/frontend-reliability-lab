import { isScenarioId, type ScenarioState } from '@/models/reliability'
import { DEFAULT_SEED } from './engine'

/** Reads `?scenario=…&seed=…`. Anything unrecognized falls back to the normal scenario. */
export function parseLabParams(search: string): ScenarioState {
  const params = new URLSearchParams(search)
  const id = params.get('scenario')
  const rawSeed = params.get('seed')
  // Number(null) and Number('') are 0, which would silently turn "no seed" into seed 0.
  const seed = rawSeed === null || rawSeed.trim() === '' ? Number.NaN : Number(rawSeed)
  return {
    id: isScenarioId(id) ? id : 'normal',
    seed: Number.isInteger(seed) && seed >= 0 ? seed : DEFAULT_SEED,
  }
}

/** The query params that reproduce a scenario. Normal (the default) needs none. */
export function toLabParams({ id, seed }: ScenarioState): Record<string, string> {
  if (id === 'normal') return {}
  return id === 'random' ? { scenario: id, seed: String(seed) } : { scenario: id }
}
