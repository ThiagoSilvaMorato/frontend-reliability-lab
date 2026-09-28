import type { ScenarioDecision, ScenarioId } from '@/models/reliability'

export const DEFAULT_SEED = 1

export interface ScenarioTiming {
  /** Latency of the "slow" scenario. Must stay below the client timeout so the request still succeeds. */
  slowMs: number
}

export const DEFAULT_TIMING: ScenarioTiming = { slowMs: 3_000 }

/** Share of requests the "random" scenario fails. With 2 retries, ~1 in 8 requests still ends in an error. */
export const RANDOM_FAILURE_RATE = 0.5
/** The "flaky" scenario fails this many attempts per URL, then recovers: exactly what the retry policy absorbs. */
export const FLAKY_FAILURES = 2

const RANDOM_FAILURES: ScenarioDecision[] = [
  { action: 'respond', status: 500 },
  { action: 'respond', status: 503 },
  { action: 'network-error' },
]

// Small, fast, well-distributed seeded PRNG (mulberry32): same seed, same sequence.
function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mutable per-activation state: the random stream and how many times each URL was requested. */
export interface ScenarioRuntime {
  readonly id: ScenarioId
  readonly seed: number
  next: () => number
  /** Counts this attempt and returns how many attempts of `requestKey` have now been made. */
  countAttempt: (requestKey: string) => number
}

export function createRuntime(id: ScenarioId, seed: number): ScenarioRuntime {
  const attempts = new Map<string, number>()
  return {
    id,
    seed,
    next: createRandom(seed),
    countAttempt(requestKey) {
      const count = (attempts.get(requestKey) ?? 0) + 1
      attempts.set(requestKey, count)
      return count
    },
  }
}

/**
 * The whole behavior of every scenario, as a pure function of (scenario state, request).
 * No MSW here: handlers only interpret the decision, which keeps this fully unit-testable.
 */
export function decide(
  runtime: ScenarioRuntime,
  requestKey: string,
  timing: ScenarioTiming = DEFAULT_TIMING,
): ScenarioDecision {
  switch (runtime.id) {
    case 'normal':
    case 'offline': // offline is simulated at the query layer; requests never leave the app
      return { action: 'proceed' }
    case 'slow':
      return { action: 'proceed', delayMs: timing.slowMs }
    case 'timeout':
      return { action: 'hang' }
    case 'http404':
      return { action: 'respond', status: 404 }
    case 'http500':
      return { action: 'respond', status: 500 }
    case 'network':
      return { action: 'network-error' }
    case 'malformed':
      return { action: 'corrupt' }
    case 'flaky':
      return runtime.countAttempt(requestKey) <= FLAKY_FAILURES
        ? { action: 'respond', status: 503 }
        : { action: 'proceed' }
    case 'random': {
      // Both values are always drawn so the stream does not depend on which branch was taken.
      const roll = runtime.next()
      const pick = runtime.next()
      if (roll >= RANDOM_FAILURE_RATE) return { action: 'proceed' }
      return RANDOM_FAILURES[Math.floor(pick * RANDOM_FAILURES.length)] ?? { action: 'proceed' }
    }
  }
}
