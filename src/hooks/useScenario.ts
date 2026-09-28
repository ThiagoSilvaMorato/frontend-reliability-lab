import { useSyncExternalStore } from 'react'
import { scenarioStore } from '@/mocks/scenarios/scenarioStore'

/** The active Reliability Lab scenario. Reads the store only, so it does not load the mock library. */
export function useScenario() {
  return useSyncExternalStore(scenarioStore.subscribe, scenarioStore.getSnapshot)
}
