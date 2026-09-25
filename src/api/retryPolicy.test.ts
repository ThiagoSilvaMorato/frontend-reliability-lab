import { describe, expect, it } from 'vitest'
import { ApiError, type ApiErrorInfo } from '@/models/api'
import { isRetryable, MAX_RETRIES, retryDelay, shouldRetry } from './retryPolicy'

const err = (info: ApiErrorInfo) => new ApiError(info)
const http = (status: number, retryAfterMs?: number) =>
  err({ kind: 'http', status, ...(retryAfterMs !== undefined && { retryAfterMs }) })

describe('isRetryable', () => {
  it.each([
    ['network failure', err({ kind: 'network' })],
    ['timeout', err({ kind: 'timeout' })],
    ['HTTP 500', http(500)],
    ['HTTP 502', http(502)],
    ['HTTP 503', http(503)],
    ['HTTP 504', http(504)],
    ['HTTP 429 without Retry-After', http(429)],
    ['HTTP 429 with a short Retry-After', http(429, 2_000)],
  ])('retries %s', (_, error) => {
    expect(isRetryable(error)).toBe(true)
  })

  it.each([
    ['HTTP 404', http(404)],
    ['HTTP 400', http(400)],
    ['HTTP 401', http(401)],
    ['HTTP 429 with a long Retry-After', http(429, 60_000)],
    ['malformed response', err({ kind: 'malformed', issues: ['id: expected number'] })],
    ['offline (query pauses instead)', err({ kind: 'offline' })],
    ['cancelled request', err({ kind: 'cancelled' })],
    ['an unexpected non-API error', new TypeError('bug')],
  ])('does not retry %s', (_, error) => {
    expect(isRetryable(error)).toBe(false)
  })
})

describe('shouldRetry', () => {
  it('stops after the maximum number of retries even for retryable errors', () => {
    const error = http(503)
    expect(shouldRetry(MAX_RETRIES - 1, error)).toBe(true)
    expect(shouldRetry(MAX_RETRIES, error)).toBe(false)
  })
})

describe('retryDelay', () => {
  const error = http(500)

  it('grows exponentially and never drops below half of the ceiling', () => {
    expect(retryDelay(0, error, () => 0)).toBe(250)
    expect(retryDelay(0, error, () => 1)).toBe(500)
    expect(retryDelay(1, error, () => 1)).toBe(1_000)
    expect(retryDelay(2, error, () => 1)).toBe(2_000)
  })

  it('is capped', () => {
    expect(retryDelay(20, error, () => 1)).toBe(8_000)
  })

  it('honors Retry-After over its own backoff', () => {
    expect(retryDelay(0, http(429, 3_000), () => 0)).toBe(3_000)
  })
})
