export const SCENARIO_IDS = [
  'normal',
  'slow',
  'timeout',
  'http404',
  'http500',
  'network',
  'malformed',
  'random',
  'flaky',
  'offline',
] as const

export type ScenarioId = (typeof SCENARIO_IDS)[number]

export function isScenarioId(value: unknown): value is ScenarioId {
  return SCENARIO_IDS.some((id) => id === value)
}

export interface ScenarioState {
  id: ScenarioId
  /** Drives every random choice; the same scenario + seed + request order gives the same outcomes. */
  seed: number
}

/** What the simulated network should do with one request. */
export type ScenarioDecision =
  | { action: 'proceed'; delayMs?: number }
  | { action: 'corrupt' }
  | { action: 'respond'; status: number }
  | { action: 'network-error' }
  | { action: 'hang' }
