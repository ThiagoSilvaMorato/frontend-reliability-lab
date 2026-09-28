import { describe, expect, it } from 'vitest'
import { SCENARIO_IDS, type ScenarioDecision, type ScenarioId } from '@/models/reliability'
import { createRuntime, decide, FLAKY_FAILURES, RANDOM_FAILURE_RATE } from './engine'

const KEY = 'GET /api/v2/pokemon/25'
const label = (d: ScenarioDecision) =>
  d.action === 'respond' ? String(d.status) : d.action === 'proceed' ? 'ok' : d.action

function sequence(seed: number, count: number, id: ScenarioId = 'random') {
  const runtime = createRuntime(id, seed)
  return Array.from({ length: count }, () => decide(runtime, KEY))
}

describe('scenario engine: fixed behaviors', () => {
  it.each<[ScenarioId, ScenarioDecision]>([
    ['normal', { action: 'proceed' }],
    ['offline', { action: 'proceed' }],
    ['timeout', { action: 'hang' }],
    ['http404', { action: 'respond', status: 404 }],
    ['http500', { action: 'respond', status: 500 }],
    ['network', { action: 'network-error' }],
    ['malformed', { action: 'corrupt' }],
  ])('%s always decides %j', (id, expected) => {
    const runtime = createRuntime(id, 1)
    expect(decide(runtime, KEY)).toEqual(expected)
    expect(decide(runtime, KEY)).toEqual(expected)
  })

  it('slow delays by the configured latency and then proceeds', () => {
    expect(decide(createRuntime('slow', 1), KEY, { slowMs: 1234 })).toEqual({
      action: 'proceed',
      delayMs: 1234,
    })
  })

  it('has a decision for every scenario', () => {
    for (const id of SCENARIO_IDS) {
      expect(() => decide(createRuntime(id, 1), KEY)).not.toThrow()
    }
  })
})

describe('scenario engine: flaky (fails N times, then recovers)', () => {
  it('fails the first attempts of a URL and then lets it through', () => {
    const runtime = createRuntime('flaky', 1)
    const outcomes = Array.from({ length: FLAKY_FAILURES + 2 }, () => label(decide(runtime, KEY)))

    expect(outcomes).toEqual(['503', '503', 'ok', 'ok'])
  })

  it('counts each URL on its own', () => {
    const runtime = createRuntime('flaky', 1)
    decide(runtime, 'GET /a')
    decide(runtime, 'GET /a')

    expect(label(decide(runtime, 'GET /a'))).toBe('ok')
    expect(label(decide(runtime, 'GET /b'))).toBe('503')
  })

  it('starts over with a fresh runtime', () => {
    const first = createRuntime('flaky', 1)
    for (let i = 0; i < 5; i++) decide(first, KEY)

    expect(label(decide(createRuntime('flaky', 1), KEY))).toBe('503')
  })
})

describe('scenario engine: random failure is reproducible', () => {
  it('gives the same outcomes for the same seed', () => {
    expect(sequence(7, 100)).toEqual(sequence(7, 100))
  })

  it('gives different outcomes for different seeds', () => {
    expect(sequence(1, 100)).not.toEqual(sequence(2, 100))
  })

  // Pinned on purpose: a change to the PRNG or the draw order would silently change every shared
  // scenario link, so it has to be a deliberate, visible edit of this test.
  it.each([
    [1, 'ok ok ok ok network-error 503 503 500 500 network-error 500 503'],
    [7, '500 ok ok 500 ok 500 ok 503 503 network-error network-error 500'],
    [42, 'ok ok 503 503 ok network-error ok 503 ok 503 ok ok'],
  ])('seed %i produces a known sequence', (seed, expected) => {
    expect(sequence(seed, 12).map(label).join(' ')).toBe(expected)
  })

  it('fails about the configured share of requests, with a mix of failure kinds', () => {
    const outcomes = sequence(99, 2000).map(label)
    const failureShare = outcomes.filter((o) => o !== 'ok').length / outcomes.length

    expect(failureShare).toBeGreaterThan(RANDOM_FAILURE_RATE - 0.05)
    expect(failureShare).toBeLessThan(RANDOM_FAILURE_RATE + 0.05)
    expect(new Set(outcomes)).toEqual(new Set(['ok', '500', '503', 'network-error']))
  })
})
