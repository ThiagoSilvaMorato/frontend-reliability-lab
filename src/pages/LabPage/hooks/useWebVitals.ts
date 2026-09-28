import { useSyncExternalStore } from 'react'
import { webVitals } from '@/observability/webVitals'

export function useWebVitals() {
  return useSyncExternalStore(webVitals.subscribe, webVitals.getSnapshot)
}
