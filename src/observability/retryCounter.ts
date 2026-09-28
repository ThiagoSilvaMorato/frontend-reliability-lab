import type { QueryCache } from '@tanstack/react-query'

// Counts retries at the QueryCache boundary. TanStack Query dispatches a `failed` action only when it is
// about to retry, so each one is exactly one automatic retry (a final failure is a different action).
let retries = 0
const listeners = new Set<() => void>()

function commit(next: number) {
  retries = next
  listeners.forEach((listener) => listener())
}

export const retryCounter = {
  getSnapshot: () => retries,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  reset: () => commit(0),
}

export function observeRetries(queryCache: QueryCache) {
  return queryCache.subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'failed') commit(retries + 1)
  })
}
