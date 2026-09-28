import { HttpResponse } from 'msw'
import { POKEAPI_BASE_URL } from '@/api/config'
import { pokemonFixtures } from './fixtures/pokemon'

function pageUrl(offset: number, limit: number) {
  return `${POKEAPI_BASE_URL}/pokemon?offset=${offset}&limit=${limit}`
}

/**
 * A stand-in for PokéAPI backed by fixtures, used where the real API must not be reached (tests).
 * Mirrors the real API: `next`/`previous` are absolute URLs, an offset past the end is a 200 with
 * no results, and a 404 has a JSON body.
 */
export function fixtureUpstream(request: Request): Response {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/v2/, '')

  if (path === '/pokemon') {
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const results = pokemonFixtures
      .slice(offset, offset + limit)
      .map(({ id, name }) => ({ name, url: `${POKEAPI_BASE_URL}/pokemon/${id}/` }))
    return HttpResponse.json({
      count: pokemonFixtures.length,
      next: offset + limit < pokemonFixtures.length ? pageUrl(offset + limit, limit) : null,
      previous: offset > 0 ? pageUrl(Math.max(0, offset - limit), limit) : null,
      results,
    })
  }

  const key = decodeURIComponent(path.replace(/^\/pokemon\//, '')).replace(/\/$/, '')
  const found = pokemonFixtures.find((p) => p.name === key || String(p.id) === key)
  return found
    ? HttpResponse.json(found)
    : HttpResponse.json({ status: 404, message: 'Not Found' }, { status: 404 })
}
