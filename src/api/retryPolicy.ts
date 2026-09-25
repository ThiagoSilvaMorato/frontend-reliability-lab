import { isApiError } from '@/models/api'

/*
 * Retry policy (see docs/decisions/0003-retry-policy.md)
 *  - Retried: network, timeout, HTTP 500/502/503/504, HTTP 429 (only if Retry-After is short).
 *  - Never retried: 4xx, malformed, offline, cancelled, and anything that is not an ApiError (bugs).
 *  - At most MAX_RETRIES retries (MAX_RETRIES + 1 attempts), exponential backoff with equal jitter.
 */
export const MAX_RETRIES = 2
const BASE_DELAY_MS = 500
const MAX_DELAY_MS = 8_000
// Waiting longer than this on a spinner is worse than showing the error with a manual retry.
const MAX_RETRY_AFTER_MS = 10_000
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504])

export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return false
  const { info } = error
  switch (info.kind) {
    case 'network':
    case 'timeout':
      return true
    case 'http':
      if (info.status === 429) return (info.retryAfterMs ?? 0) <= MAX_RETRY_AFTER_MS
      return RETRYABLE_STATUSES.has(info.status)
    case 'offline': // TanStack Query pauses and resumes on reconnect instead
    case 'malformed': // the same body will fail validation again
    case 'cancelled':
      return false
  }
}

/** `failureCount` is the number of failures so far (0 on the first failure), as TanStack Query passes it. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryable(error)
}

// Equal jitter: half fixed, half random. Spreads clients out without allowing a near-zero delay.
export function retryDelay(failureCount: number, error: unknown, random = Math.random): number {
  if (isApiError(error) && error.info.kind === 'http' && error.info.retryAfterMs !== undefined) {
    return error.info.retryAfterMs
  }
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** failureCount)
  return ceiling / 2 + random() * (ceiling / 2)
}
