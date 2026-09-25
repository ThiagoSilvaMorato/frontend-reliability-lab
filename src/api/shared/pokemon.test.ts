import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { POKEAPI_BASE_URL } from '@/api/config'
import { pokemonFixtures } from '@/mocks/fixtures/pokemon'
import { server } from '@/mocks/server'
import { requestLog } from '@/observability/requestLog'
import { fetchAllPokemon, fetchPokemon, fetchPokemonList } from './pokemon'

describe('fetchPokemonList', () => {
  it('returns a validated page', async () => {
    const page = await fetchPokemonList({ limit: 2, offset: 0 })
    expect(page.count).toBe(pokemonFixtures.length)
    expect(page.results).toEqual([
      { id: 1, name: 'bulbasaur' },
      { id: 2, name: 'ivysaur' },
    ])
  })
})

describe('fetchAllPokemon', () => {
  it('returns every Pokémon in a single request', async () => {
    const all = await fetchAllPokemon()

    expect(all).toHaveLength(pokemonFixtures.length)
    expect(all).toContainEqual({ id: 25, name: 'pikachu' })
    expect(requestLog.getSnapshot()).toHaveLength(1)
  })
})

describe('fetchPokemon', () => {
  it('encodes the name so it stays a single path segment', async () => {
    await expect(fetchPokemon('a/../b')).rejects.toMatchObject({
      info: { kind: 'http', status: 404 },
    })
    expect(requestLog.getSnapshot()[0]?.url).toBe(`${POKEAPI_BASE_URL}/pokemon/a%2F..%2Fb`)
  })

  it('returns a validated Pokémon', async () => {
    await expect(fetchPokemon('pikachu')).resolves.toMatchObject({ id: 25, name: 'pikachu' })
  })

  it('rejects with an http 404 for an unknown Pokémon', async () => {
    await expect(fetchPokemon('missingno')).rejects.toMatchObject({
      info: { kind: 'http', status: 404 },
    })
  })

  it('rejects with malformed when the body does not match the schema, even on HTTP 200', async () => {
    server.use(
      http.get(`${POKEAPI_BASE_URL}/pokemon/:nameOrId`, () =>
        HttpResponse.json({ id: '25', name: 'pikachu' }),
      ),
    )

    await expect(fetchPokemon('pikachu')).rejects.toMatchObject({ info: { kind: 'malformed' } })
  })

  it('reports the malformed body in the request log instead of as a success', async () => {
    server.use(
      http.get(`${POKEAPI_BASE_URL}/pokemon/:nameOrId`, () => HttpResponse.json({ nope: true })),
    )

    await fetchPokemon('pikachu').catch(() => undefined)

    expect(requestLog.getSnapshot()).toMatchObject([{ status: 200, outcome: 'malformed' }])
  })

  it('rejects when the body is not JSON at all', async () => {
    server.use(
      http.get(`${POKEAPI_BASE_URL}/pokemon/:nameOrId`, () =>
        HttpResponse.text('<html>oops</html>'),
      ),
    )

    await expect(fetchPokemon('pikachu')).rejects.toMatchObject({ info: { kind: 'malformed' } })
  })
})
