import { useSyncExternalStore } from 'react'
import { requestLog } from '@/observability/requestLog'
import { retryCounter } from '@/observability/retryCounter'

export function useRequestLog() {
  return useSyncExternalStore(requestLog.subscribe, requestLog.getSnapshot)
}

export function useRetryCount() {
  return useSyncExternalStore(retryCounter.subscribe, retryCounter.getSnapshot)
}
