import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/**
 * Connectivity as TanStack Query sees it (browser online/offline events), so the banner and the
 * paused queries always agree, and the Reliability Lab can simulate being offline through the same source.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  )
}
