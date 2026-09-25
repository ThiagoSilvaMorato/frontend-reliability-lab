import type { AxiosError } from 'axios'
import { ApiError } from '@/models/api'

// Axios reports timeouts as ETIMEDOUT only with `transitional.clarifyTimeoutError` (set in the client).
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ECONNABORTED'])

/** Parses `Retry-After` (delta-seconds or HTTP-date) into milliseconds. */
export function parseRetryAfter(value: unknown, now = Date.now()): number | undefined {
  if (typeof value !== 'string') return undefined
  const seconds = Number(value)
  if (value.trim() !== '' && Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - now)
}

export function normalizeAxiosError(error: AxiosError): ApiError {
  const options = { cause: error }

  if (error.code === 'ERR_CANCELED') return new ApiError({ kind: 'cancelled' }, options)

  if (error.response) {
    const retryAfterMs = parseRetryAfter(error.response.headers['retry-after'])
    return new ApiError(
      {
        kind: 'http',
        status: error.response.status,
        ...(retryAfterMs !== undefined && { retryAfterMs }),
      },
      options,
    )
  }

  if (error.code && TIMEOUT_CODES.has(error.code)) return new ApiError({ kind: 'timeout' }, options)

  // No response and no timeout: the browser's own connectivity signal tells offline apart from a network failure.
  return new ApiError({ kind: navigator.onLine ? 'network' : 'offline' }, options)
}
