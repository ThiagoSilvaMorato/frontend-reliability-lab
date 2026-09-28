import { describe, expect, it } from 'vitest'
import { SCENARIO_IDS } from '@/models/reliability'
import { parseLabParams, toLabParams } from './params'

describe('parseLabParams', () => {
  it.each([
    ['', { id: 'normal', seed: 1 }],
    ['?scenario=http500', { id: 'http500', seed: 1 }],
    ['?scenario=random&seed=42', { id: 'random', seed: 42 }],
    ['?scenario=random&seed=0', { id: 'random', seed: 0 }],
    ['?scenario=nonsense', { id: 'normal', seed: 1 }],
    ['?scenario=random&seed=abc', { id: 'random', seed: 1 }],
    ['?scenario=random&seed=-3', { id: 'random', seed: 1 }],
    ['?scenario=random&seed=1.5', { id: 'random', seed: 1 }],
    ['?scenario=random&seed=', { id: 'random', seed: 1 }],
    ['?page=2&q=pika', { id: 'normal', seed: 1 }],
  ])('%s → %j', (search, expected) => {
    expect(parseLabParams(search)).toEqual(expected)
  })
})

describe('toLabParams', () => {
  it('omits everything for normal and the seed for non-random scenarios', () => {
    expect(toLabParams({ id: 'normal', seed: 9 })).toEqual({})
    expect(toLabParams({ id: 'http500', seed: 9 })).toEqual({ scenario: 'http500' })
  })

  it('keeps the seed for random, which is what makes it reproducible', () => {
    expect(toLabParams({ id: 'random', seed: 9 })).toEqual({ scenario: 'random', seed: '9' })
  })

  it('round-trips every scenario through a URL', () => {
    for (const id of SCENARIO_IDS) {
      const state = { id, seed: 5 }
      const search = `?${new URLSearchParams(toLabParams(state)).toString()}`
      expect(parseLabParams(search).id).toBe(id)
    }
  })
})
