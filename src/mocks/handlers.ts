import { delay, http, HttpResponse } from 'msw'
import { POKEAPI_BASE_URL } from '@/api/config'
import { scenarioStore } from './scenarios/scenarioStore'

/** Produces the healthy response for a request: fixtures in tests, the real PokéAPI in the browser. */
export type Upstream = (request: Request) => Response | Promise<Response>

function requestKey(request: Request) {
  const { pathname, search } = new URL(request.url)
  return `${request.method} ${pathname}${search}`
}

// A 200 whose body no longer matches what the app expects: exactly what schema validation is for.
function corrupt(request: Request, body: unknown): Record<string, unknown> {
  const { pathname } = new URL(request.url)
  const record: Record<string, unknown> =
    typeof body === 'object' && body !== null ? { ...body } : {}
  return pathname.endsWith('/pokemon')
    ? { ...record, count: 'unknown' }
    : { ...record, types: null }
}

/**
 * The single handler set for every environment. Which scenario is active is read from the scenario
 * store on each request; only `upstream` differs between environments, so scenario behavior cannot drift.
 */
export function createHandlers(upstream: Upstream) {
  return [
    http.all(`${POKEAPI_BASE_URL}/*`, async ({ request }) => {
      const decision = scenarioStore.decide(requestKey(request))

      switch (decision.action) {
        case 'proceed':
          if (decision.delayMs) await delay(decision.delayMs)
          return upstream(request)
        case 'corrupt': {
          const response = await upstream(request)
          if (!response.ok) return response
          return HttpResponse.json(corrupt(request, await response.json()), {
            status: response.status,
          })
        }
        case 'respond':
          return HttpResponse.json(
            { status: decision.status, message: 'Simulated by the Reliability Lab' },
            { status: decision.status },
          )
        case 'network-error':
          return HttpResponse.error()
        case 'hang':
          // Never answers: the client's own timeout is what ends the request.
          await delay('infinite')
          return undefined
      }
    }),
  ]
}
