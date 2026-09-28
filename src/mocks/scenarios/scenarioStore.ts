import type { ScenarioDecision, ScenarioId, ScenarioState } from '@/models/reliability'
import {
  createRuntime,
  decide,
  DEFAULT_SEED,
  DEFAULT_TIMING,
  type ScenarioRuntime,
  type ScenarioTiming,
} from './engine'

// External store (useSyncExternalStore-compatible) holding the active scenario. It has no MSW
// dependency, so the UI can read it without pulling the mock library into the main bundle.
let state: ScenarioState = { id: 'normal', seed: DEFAULT_SEED }
let runtime: ScenarioRuntime = createRuntime(state.id, state.seed)
let timing: ScenarioTiming = DEFAULT_TIMING
const listeners = new Set<() => void>()

export const scenarioStore = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Starts a scenario from scratch: fresh random stream and fresh attempt counters. */
  activate: (id: ScenarioId, seed: number = DEFAULT_SEED) => {
    state = { id, seed }
    runtime = createRuntime(id, seed)
    listeners.forEach((listener) => listener())
  },
  decide: (requestKey: string): ScenarioDecision => decide(runtime, requestKey, timing),
  /** Tests shorten the slow scenario; the app never calls this. */
  configureTiming: (next: Partial<ScenarioTiming>) => {
    timing = { ...timing, ...next }
  },
  resetTiming: () => {
    timing = DEFAULT_TIMING
  },
}
