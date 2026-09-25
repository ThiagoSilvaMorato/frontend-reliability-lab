import '@testing-library/jest-dom/vitest'
import { onlineManager } from '@tanstack/react-query'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/server'
import { requestLog } from '@/observability/requestLog'

// Unhandled requests fail the test: a test must never hit the real PokéAPI.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.lang = 'en'
  server.resetHandlers()
  onlineManager.setOnline(true)
  requestLog.clear()
})

afterAll(() => server.close())
