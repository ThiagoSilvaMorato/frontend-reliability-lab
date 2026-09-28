import type { RequestLogEntry } from '@/models/observability'

export interface RequestSummary {
  total: number
  succeeded: number
  /** Everything that did not produce usable data, except requests we cancelled ourselves. */
  failed: number
  cancelled: number
  averageDurationMs: number | null
  /** How many consecutive attempts failed right before the most recent success, if any did. */
  recoveredAfter: number | null
}

/** Reads entries in the order they completed. */
export function summarizeRequests(entries: readonly RequestLogEntry[]): RequestSummary {
  let succeeded = 0
  let failed = 0
  let cancelled = 0
  let durationTotal = 0
  let measured = 0
  let failuresInARow = 0
  let recoveredAfter: number | null = null

  for (const entry of entries) {
    if (entry.outcome === 'cancelled') {
      cancelled++
      continue
    }
    durationTotal += entry.durationMs
    measured++
    if (entry.outcome === 'success') {
      succeeded++
      if (failuresInARow > 0) recoveredAfter = failuresInARow
      failuresInARow = 0
    } else {
      failed++
      failuresInARow++
    }
  }

  return {
    total: entries.length,
    succeeded,
    failed,
    cancelled,
    averageDurationMs: measured > 0 ? Math.round(durationTotal / measured) : null,
    recoveredAfter,
  }
}
