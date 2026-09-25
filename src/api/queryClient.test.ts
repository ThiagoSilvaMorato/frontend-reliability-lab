import { CancelledError } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { POKEAPI_BASE_URL } from '@/api/config'
import { pokemonFixtures } from '@/mocks/fixtures/pokemon'
import { server } from '@/mocks/server'
import { requestLog } from '@/observability/requestLog'
import { fetchPokemon } from './shared/pokemon'
import { createQueryClient } from './queryClient'

const detailUrl = `${POKEAPI_BASE_URL}/pokemon/:nameOrId`
const pikachu = pokemonFixtures[2]

function setup() {
  const client = createQueryClient({ retryDelay: () => 1 })
  const load = () =>
    client.fetchQuery({
      queryKey: ['pokemon', 'pikachu'],
      queryFn: ({ signal }) => fetchPokemon('pikachu', signal),
    })
  return { client, load }
}

/** Responds with `statuses` in order, then with the normal Pokémon. Returns the request counter. */
function failThenRecover(...statuses: number[]) {
  const counter = { requests: 0 }
  server.use(
    http.get(detailUrl, () => {
      const status = statuses[counter.requests++]
      return status ? new HttpResponse(null, { status }) : HttpResponse.json(pikachu)
    }),
  )
  return counter
}

describe('query client reliability behavior', () => {
  it('recovers from transient server errors without surfacing an error', async () => {
    const counter = failThenRecover(500, 503)
    const { load } = setup()

    await expect(load()).resolves.toMatchObject({ name: 'pikachu' })

    expect(counter.requests).toBe(3)
    expect(requestLog.getSnapshot().map((e) => e.status)).toEqual([500, 503, 200])
  })

  it('gives up after the retry limit and surfaces the last error', async () => {
    const counter = failThenRecover(500, 500, 500, 500)
    const { load } = setup()

    await expect(load()).rejects.toMatchObject({ info: { kind: 'http', status: 500 } })

    expect(counter.requests).toBe(3)
  })

  it('does not retry a 404', async () => {
    const counter = failThenRecover(404)
    const { load } = setup()

    await expect(load()).rejects.toMatchObject({ info: { kind: 'http', status: 404 } })

    expect(counter.requests).toBe(1)
  })

  it('does not retry a malformed response', async () => {
    const counter = { requests: 0 }
    server.use(
      http.get(detailUrl, () => {
        counter.requests++
        return HttpResponse.json({ id: 'not-a-number' })
      }),
    )
    const { load } = setup()

    await expect(load()).rejects.toMatchObject({ info: { kind: 'malformed' } })

    expect(counter.requests).toBe(1)
  })

  it('retries network failures', async () => {
    const counter = { requests: 0 }
    server.use(
      http.get(detailUrl, () => {
        return counter.requests++ === 0 ? HttpResponse.error() : HttpResponse.json(pikachu)
      }),
    )
    const { load } = setup()

    await expect(load()).resolves.toMatchObject({ name: 'pikachu' })

    expect(counter.requests).toBe(2)
  })

  it('deduplicates concurrent identical requests into one HTTP call', async () => {
    const counter = failThenRecover()
    const { load } = setup()

    const results = await Promise.all([load(), load(), load()])

    expect(counter.requests).toBe(1)
    expect(new Set(results).size).toBe(1)
  })

  it('serves a fresh cache entry without a new HTTP call', async () => {
    const counter = failThenRecover()
    const { load } = setup()

    await load()
    await load()

    expect(counter.requests).toBe(1)
  })

  it('aborts the in-flight HTTP request when the query is cancelled', async () => {
    server.use(http.get(detailUrl, () => delay('infinite')))
    const { client, load } = setup()

    const pending = load()
    // Let the request start before cancelling.
    await new Promise((resolve) => setTimeout(resolve, 20))
    await client.cancelQueries()

    await expect(pending).rejects.toBeInstanceOf(CancelledError)
    await expect.poll(() => requestLog.getSnapshot().map((e) => e.outcome)).toEqual(['cancelled'])
  })
})
