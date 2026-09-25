import { http, HttpResponse } from 'msw'
import { POKEAPI_BASE_URL } from '@/api/config'
import { pokemonFixtures } from './fixtures/pokemon'

// Mirrors the real API: `next`/`previous` are absolute URLs (or null), and a 404 has a JSON body.
function pageUrl(offset: number, limit: number) {
  return `${POKEAPI_BASE_URL}/pokemon?offset=${offset}&limit=${limit}`
}

export const handlers = [
  http.get(`${POKEAPI_BASE_URL}/pokemon`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const limit = Number(params.get('limit') ?? 20)
    const offset = Number(params.get('offset') ?? 0)
    const results = pokemonFixtures
      .slice(offset, offset + limit)
      .map(({ id, name }) => ({ name, url: `${POKEAPI_BASE_URL}/pokemon/${id}/` }))
    return HttpResponse.json({
      count: pokemonFixtures.length,
      next: offset + limit < pokemonFixtures.length ? pageUrl(offset + limit, limit) : null,
      previous: offset > 0 ? pageUrl(Math.max(0, offset - limit), limit) : null,
      results,
    })
  }),

  http.get(`${POKEAPI_BASE_URL}/pokemon/:nameOrId`, ({ params }) => {
    const key = String(params['nameOrId'])
    const found = pokemonFixtures.find((p) => p.name === key || String(p.id) === key)
    return found
      ? HttpResponse.json(found)
      : HttpResponse.json({ status: 404, message: 'Not Found' }, { status: 404 })
  }),
]
