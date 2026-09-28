import { bypass } from 'msw'
import { setupWorker } from 'msw/browser'
import { createHandlers, type Upstream } from './handlers'

// Healthy responses come from the real PokéAPI; `bypass` sends the request past the worker.
const realUpstream: Upstream = async (request) => {
  const response = await fetch(bypass(request))
  // Re-wrap the already-decoded body: forwarding the original headers would advertise an encoding
  // (gzip, br) that no longer applies and break decoding in the page.
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
  })
}

const worker = setupWorker(...createHandlers(realUpstream))

export function startWorker() {
  return worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

export function stopWorker() {
  worker.stop()
}
