import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { httpClient } from '@/api'
import { fetchPokemon, fetchPokemonList } from '@/api/shared/pokemon'
import { isApiError } from '@/models/api'
import type { ScenarioId } from '@/models/reliability'
import { requestLog } from '@/observability/requestLog'
import { scenarioStore } from './scenarioStore'

// The handlers under test are the ones the browser worker uses: only the upstream differs.
const activate = scenarioStore.activate

async function outcomeOf(request: Promise<unknown>) {
  try {
    await request
    return 'ok'
  } catch (error) {
    if (!isApiError(error)) throw error
    return error.info.kind === 'http' ? String(error.info.status) : error.info.kind
  }
}

describe('scenarios seen through the real HTTP client', () => {
  const originalTimeout = httpClient.defaults.timeout
  beforeEach(() => {
    httpClient.defaults.timeout = 40
  })
  afterEach(() => {
    httpClient.defaults.timeout = originalTimeout
  })

  it.each<[ScenarioId, string]>([
    ['normal', 'ok'],
    ['offline', 'ok'],
    ['http404', '404'],
    ['http500', '500'],
    ['network', 'network'],
    ['timeout', 'timeout'],
    ['malformed', 'malformed'],
  ])('%s → %s', async (id, expected) => {
    activate(id)

    expect(await outcomeOf(fetchPokemon('pikachu'))).toBe(expected)
  })

  it('malformed answers 200 and is caught by schema validation, for the list as well', async () => {
    activate('malformed')

    expect(await outcomeOf(fetchPokemonList({ limit: 20, offset: 0 }))).toBe('malformed')
    expect(requestLog.getSnapshot()).toMatchObject([{ status: 200, outcome: 'malformed' }])
  })

  it('slow succeeds, but only after the configured latency', async () => {
    scenarioStore.configureTiming({ slowMs: 30 })
    activate('slow')

    const start = performance.now()
    await fetchPokemon('pikachu')

    expect(performance.now() - start).toBeGreaterThanOrEqual(25)
  })

  it('flaky fails twice per URL and then recovers', async () => {
    activate('flaky')

    const statuses = []
    for (let i = 0; i < 3; i++) statuses.push(await outcomeOf(fetchPokemon('pikachu')))

    expect(statuses).toEqual(['503', '503', 'ok'])
    expect(await outcomeOf(fetchPokemon('bulbasaur'))).toBe('503')
  })

  it('random reproduces the same failures for the same seed, and starts over on re-activation', async () => {
    async function run(seed: number) {
      activate('random', seed)
      const outcomes = []
      for (let i = 0; i < 12; i++) outcomes.push(await outcomeOf(fetchPokemon('pikachu')))
      return outcomes
    }

    const first = await run(7)

    expect(await run(7)).toEqual(first)
    expect(await run(8)).not.toEqual(first)
    expect(first).toContain('ok')
    expect(first.some((outcome) => outcome !== 'ok')).toBe(true)
  })

  it('switching back to normal recovers immediately', async () => {
    activate('http500')
    expect(await outcomeOf(fetchPokemon('pikachu'))).toBe('500')

    activate('normal')

    expect(await outcomeOf(fetchPokemon('pikachu'))).toBe('ok')
  })
})
