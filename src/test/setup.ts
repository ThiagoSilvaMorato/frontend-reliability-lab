import '@testing-library/jest-dom/vitest'
import { onlineManager } from '@tanstack/react-query'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/server'
import { scenarioStore } from '@/mocks/scenarios/scenarioStore'
import { setWorkerLoader } from '@/mocks/lab'
import { requestLog } from '@/observability/requestLog'
import { retryCounter } from '@/observability/retryCounter'

// The node server already intercepts in tests; there is no service worker to start.
setWorkerLoader(() =>
  Promise.resolve({ startWorker: () => Promise.resolve(), stopWorker: () => undefined }),
)

// Unhandled requests fail the test: a test must never hit the real PokéAPI.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.lang = 'en'
  server.resetHandlers()
  onlineManager.setOnline(true)
  scenarioStore.activate('normal')
  scenarioStore.resetTiming()
  requestLog.clear()
  retryCounter.reset()
})

afterAll(() => server.close())
