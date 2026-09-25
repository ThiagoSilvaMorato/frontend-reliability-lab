import { httpClient } from '@/api'
import { pokemonListSchema, pokemonSchema } from '@/models/pokemon'
import { parseResponse } from './validate'

export interface PokemonListParams {
  limit: number
  offset: number
}

// PokéAPI has no search endpoint. One request with a limit above `count` returns every name
// (~1.3k entries, ~90 KB), which the client can then filter without further requests.
const ALL_POKEMON_LIMIT = 100_000

export async function fetchPokemonList({ limit, offset }: PokemonListParams, signal?: AbortSignal) {
  const response = await httpClient.get<unknown>('/pokemon', { params: { limit, offset }, signal })
  return parseResponse(pokemonListSchema, response)
}

export async function fetchAllPokemon(signal?: AbortSignal) {
  const { results } = await fetchPokemonList({ limit: ALL_POKEMON_LIMIT, offset: 0 }, signal)
  return results
}

export async function fetchPokemon(nameOrId: string | number, signal?: AbortSignal) {
  // The value comes from the URL bar: encode it so it can only ever be one path segment.
  const path = `/pokemon/${encodeURIComponent(String(nameOrId))}`
  const response = await httpClient.get<unknown>(path, { signal })
  return parseResponse(pokemonSchema, response)
}
