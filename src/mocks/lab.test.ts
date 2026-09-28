import { onlineManager } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestLog } from '@/observability/requestLog'
import { retryCounter } from '@/observability/retryCounter'
import { applyScenario, initLabFromUrl, setWorkerLoader } from './lab'
import { scenarioStore } from './scenarios/scenarioStore'

const active = () => scenarioStore.getSnapshot()

describe('Reliability Lab controller', () => {
  const startWorker = vi.fn(() => Promise.resolve())
  const stopWorker = vi.fn()
  const loader = vi.fn(() => Promise.resolve({ startWorker, stopWorker }))

  beforeEach(() => {
    startWorker.mockClear()
    stopWorker.mockClear()
    loader.mockClear()
    setWorkerLoader(loader)
  })
  afterEach(() => applyScenario('normal'))

  it('does not even load the mock library for the normal scenario', async () => {
    await applyScenario('normal')

    expect(loader).not.toHaveBeenCalled()
    expect(active().id).toBe('normal')
  })

  it('starts the worker once, on demand, and stops it when returning to normal', async () => {
    await applyScenario('http500')
    await applyScenario('timeout')

    expect(startWorker).toHaveBeenCalledTimes(1)
    expect(active().id).toBe('timeout')

    await applyScenario('normal')

    expect(stopWorker).toHaveBeenCalledTimes(1)
    expect(active().id).toBe('normal')
  })

  it('has the worker running before the scenario becomes active', async () => {
    let scenarioWhenWorkerStarted = ''
    startWorker.mockImplementationOnce(() => {
      scenarioWhenWorkerStarted = active().id
      return Promise.resolve()
    })

    await applyScenario('http500')

    expect(scenarioWhenWorkerStarted).toBe('normal')
    expect(active().id).toBe('http500')
  })

  it('simulates offline without a worker, and restores connectivity when leaving', async () => {
    await applyScenario('offline')

    expect(onlineManager.isOnline()).toBe(false)
    expect(loader).not.toHaveBeenCalled()

    await applyScenario('normal')

    expect(onlineManager.isOnline()).toBe(true)
  })

  it('starts every scenario from a clean observation window', async () => {
    requestLog.record({
      id: 1,
      method: 'GET',
      url: 'x',
      startedAt: 0,
      durationMs: 1,
      outcome: 'success',
    })

    await applyScenario('http500')

    expect(requestLog.getSnapshot()).toHaveLength(0)
    expect(retryCounter.getSnapshot()).toBe(0)
  })

  it('keeps the seed, so a random scenario can be reproduced', async () => {
    await applyScenario('random', 42)

    expect(active()).toEqual({ id: 'random', seed: 42 })
  })

  it('lets the latest selection win when an earlier one is still loading', async () => {
    let finishStart = () => {}
    startWorker.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishStart = resolve)),
    )

    const slowSelection = applyScenario('http500')
    await applyScenario('offline')
    finishStart()
    await slowSelection

    expect(active().id).toBe('offline')
  })
})

describe('initLabFromUrl', () => {
  const startWorker = vi.fn(() => Promise.resolve())
  const stopWorker = vi.fn()
  const loader = vi.fn(() => Promise.resolve({ startWorker, stopWorker }))

  beforeEach(() => {
    loader.mockClear()
    startWorker.mockClear()
    setWorkerLoader(loader)
  })
  afterEach(() => applyScenario('normal'))

  it('activates the scenario and seed from a shared link', async () => {
    await initLabFromUrl('?scenario=random&seed=42')

    expect(active()).toEqual({ id: 'random', seed: 42 })
  })

  it('ignores a link without a valid scenario', async () => {
    await initLabFromUrl('?scenario=nonsense')

    expect(active().id).toBe('normal')
    expect(loader).not.toHaveBeenCalled()
  })

  it('falls back to normal, and says why, when the worker cannot start', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    startWorker.mockRejectedValueOnce(new Error('service workers are not available'))

    await initLabFromUrl('?scenario=http500')

    expect(active().id).toBe('normal')
    expect(error).toHaveBeenCalled()
  })
})
