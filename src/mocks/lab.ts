import { onlineManager } from '@tanstack/react-query'
import type { ScenarioId } from '@/models/reliability'
import { requestLog } from '@/observability/requestLog'
import { retryCounter } from '@/observability/retryCounter'
import { DEFAULT_SEED } from './scenarios/engine'
import { parseLabParams } from './scenarios/params'
import { scenarioStore } from './scenarios/scenarioStore'

interface WorkerControls {
  startWorker: () => Promise<unknown>
  stopWorker: () => void
}

// The mock library is loaded on demand: users who never leave the Normal scenario never download MSW.
// Tests replace the loader, because the node server already intercepts there.
let loadWorker: () => Promise<WorkerControls> = () => import('./browser')
let workerRunning = false
let latestRequest = 0

export function setWorkerLoader(loader: () => Promise<WorkerControls>) {
  loadWorker = loader
}

// Normal talks to the real API with no interception at all; offline is simulated at the query layer.
const needsWorker = (id: ScenarioId) => id !== 'normal' && id !== 'offline'

/**
 * Switches the whole app to a scenario. Order matters: the worker must be running before the scenario
 * becomes active, and the scenario must be active before connectivity is restored, so requests that
 * resume as a result already meet the new behavior.
 */
export async function applyScenario(id: ScenarioId, seed: number = DEFAULT_SEED) {
  const ticket = ++latestRequest

  if (needsWorker(id) && !workerRunning) {
    await (await loadWorker()).startWorker()
    workerRunning = true
  } else if (!needsWorker(id) && workerRunning) {
    ;(await loadWorker()).stopWorker()
    workerRunning = false
  }
  if (ticket !== latestRequest) return // a newer selection superseded this one while it was loading

  scenarioStore.activate(id, seed)
  requestLog.clear()
  retryCounter.reset()
  onlineManager.setOnline(id !== 'offline')
}

/** Called before the first render so a shared `?scenario=` link behaves the same from the first request. */
export async function initLabFromUrl(search: string) {
  const { id, seed } = parseLabParams(search)
  if (id === 'normal') return
  try {
    await applyScenario(id, seed)
  } catch (error) {
    console.error(
      '[Reliability Lab] could not start the simulation; continuing in Normal mode',
      error,
    )
  }
}
