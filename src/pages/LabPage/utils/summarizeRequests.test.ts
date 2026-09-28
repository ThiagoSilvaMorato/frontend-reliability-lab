import { describe, expect, it } from 'vitest'
import type { RequestLogEntry, RequestOutcome } from '@/models/observability'
import { summarizeRequests } from './summarizeRequests'

let id = 0
const entry = (outcome: RequestOutcome, durationMs = 100): RequestLogEntry => ({
  id: ++id,
  method: 'GET',
  url: 'https://pokeapi.co/api/v2/pokemon/25',
  startedAt: 0,
  durationMs,
  outcome,
})

describe('summarizeRequests', () => {
  it('summarizes an empty log', () => {
    expect(summarizeRequests([])).toEqual({
      total: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      averageDurationMs: null,
      recoveredAfter: null,
    })
  })

  it('counts outcomes; malformed and every error kind are failures, cancellations are not', () => {
    const summary = summarizeRequests([
      entry('success'),
      entry('http'),
      entry('network'),
      entry('timeout'),
      entry('malformed'),
      entry('cancelled'),
    ])

    expect(summary).toMatchObject({ total: 6, succeeded: 1, failed: 4, cancelled: 1 })
  })

  it('averages durations, ignoring cancelled requests', () => {
    const summary = summarizeRequests([
      entry('success', 100),
      entry('http', 300),
      entry('cancelled', 9999),
    ])

    expect(summary.averageDurationMs).toBe(200)
  })

  it('reports recovery: how many attempts failed before the success that followed', () => {
    const summary = summarizeRequests([
      entry('http'),
      entry('http'),
      entry('cancelled'),
      entry('success'),
    ])

    expect(summary.recoveredAfter).toBe(2)
  })

  it('reports nothing when it never failed, or failed and never recovered', () => {
    expect(summarizeRequests([entry('success'), entry('success')]).recoveredAfter).toBeNull()
    expect(summarizeRequests([entry('http'), entry('http')]).recoveredAfter).toBeNull()
  })

  it('keeps the most recent recovery', () => {
    const summary = summarizeRequests([
      entry('http'),
      entry('success'),
      entry('network'),
      entry('network'),
      entry('network'),
      entry('success'),
    ])

    expect(summary.recoveredAfter).toBe(3)
  })
})
