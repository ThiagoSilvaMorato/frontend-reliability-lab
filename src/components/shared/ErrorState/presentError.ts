import { isApiError } from '@/models/api'

export type ErrorVariant =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'notFound'
  | 'server'
  | 'rateLimited'
  | 'client'
  | 'malformed'
  | 'unexpected'

/** Which `errors.badge.*` label to show: HTTP errors share one label that carries the status. */
export type BadgeKind = 'http' | 'offline' | 'network' | 'timeout' | 'malformed' | 'unexpected'

export interface ErrorPresentation {
  variant: ErrorVariant
  badge: BadgeKind
  /** HTTP status, when the server answered. Shown in the badge. */
  status?: number
  /** False when trying again cannot change the outcome (a request the server rejects). */
  canRetry: boolean
}

function httpVariant(status: number): ErrorVariant {
  if (status === 404) return 'notFound'
  if (status === 429) return 'rateLimited'
  return status >= 500 ? 'server' : 'client'
}

/**
 * Maps an error to what the user needs to know. Offline, network, timeout, HTTP and malformed
 * responses are different situations and are never collapsed into one generic message.
 */
export function presentError(error: unknown): ErrorPresentation {
  if (!isApiError(error)) return { variant: 'unexpected', badge: 'unexpected', canRetry: true }

  const { info } = error
  switch (info.kind) {
    case 'http': {
      const variant = httpVariant(info.status)
      return {
        variant,
        badge: 'http',
        status: info.status,
        canRetry: variant !== 'notFound' && variant !== 'client',
      }
    }
    case 'offline':
    case 'network':
    case 'timeout':
    case 'malformed':
      return { variant: info.kind, badge: info.kind, canRetry: true }
    case 'cancelled':
      // Cancellation is ours; it should never reach the UI as an error.
      return { variant: 'unexpected', badge: 'unexpected', canRetry: true }
  }
}
