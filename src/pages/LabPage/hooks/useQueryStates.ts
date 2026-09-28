import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

export interface QueryStates {
  fetching: number
  /** Waiting for connectivity: not failed, not fetching. */
  paused: number
  errored: number
  ready: number
}

/** What the queries on screen are doing right now. Only queries something is observing are counted. */
export function useQueryStates(): QueryStates {
  const queryClient = useQueryClient()
  const cache = queryClient.getQueryCache()

  // A primitive snapshot: unchanged counts compare equal, so React does not re-render for nothing.
  const snapshot = useSyncExternalStore(
    (listener) => cache.subscribe(listener),
    () => {
      const counts = { fetching: 0, paused: 0, errored: 0, ready: 0 }
      for (const query of cache.getAll()) {
        if (query.getObserversCount() === 0) continue
        if (query.state.fetchStatus === 'fetching') counts.fetching++
        else if (query.state.fetchStatus === 'paused') counts.paused++
        else if (query.state.status === 'error') counts.errored++
        else if (query.state.status === 'success') counts.ready++
      }
      return `${counts.fetching},${counts.paused},${counts.errored},${counts.ready}`
    },
  )

  const [fetching = 0, paused = 0, errored = 0, ready = 0] = snapshot.split(',').map(Number)
  return { fetching, paused, errored, ready }
}
