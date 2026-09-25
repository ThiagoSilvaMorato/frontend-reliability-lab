import { httpClient } from '@/api'
import { pokemonListSchema, pokemonSchema } from '@/models/pokemon'
import { parseResponse } from './validate'

export interface PokemonListParams {
  limit: number
  offset: number
}

export async function fetchPokemonList({ limit, offset }: PokemonListParams, signal?: AbortSignal) {
  const response = await httpClient.get<unknown>('/pokemon', { params: { limit, offset }, signal })
  return parseResponse(pokemonListSchema, response)
}

export async function fetchPokemon(nameOrId: string | number, signal?: AbortSignal) {
  const response = await httpClient.get<unknown>(`/pokemon/${nameOrId}`, { signal })
  return parseResponse(pokemonSchema, response)
}
