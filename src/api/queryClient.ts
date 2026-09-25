import { QueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from './retryPolicy'

interface QueryClientOptions {
  /** Tests inject a near-zero delay so retries do not sleep. */
  retryDelay?: (failureCount: number, error: unknown) => number
}

export function createQueryClient(options: QueryClientOptions = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Pokémon data is effectively static: a fresh entry is reused (and concurrent identical
        // requests are deduplicated) for a minute before a background refetch is considered.
        staleTime: 60_000,
        // Only recoverable failures are retried; see retryPolicy.ts.
        retry: shouldRetry,
        retryDelay: options.retryDelay ?? retryDelay,
        // networkMode stays 'online' (default) on purpose: while offline, queries pause and resume
        // on reconnect instead of failing.
      },
    },
  })
}
