import { queryOptions } from '@tanstack/react-query'
import { fetchAllPokemon, fetchPokemon, fetchPokemonList, type PokemonListParams } from './pokemon'

const HOUR_MS = 60 * 60 * 1000

/**
 * Query keys and options for the Pokémon domain: the single source of truth shared by hooks,
 * prefetching and cache invalidation, so a key can never drift between them.
 */
export const pokemonQueries = {
  all: () => ['pokemon'] as const,

  list: (params: PokemonListParams) =>
    queryOptions({
      queryKey: [...pokemonQueries.all(), 'list', params] as const,
      queryFn: ({ signal }) => fetchPokemonList(params, signal),
    }),

  detail: (name: string) => {
    const normalized = name.toLowerCase()
    return queryOptions({
      queryKey: [...pokemonQueries.all(), 'detail', normalized] as const,
      queryFn: ({ signal }) => fetchPokemon(normalized, signal),
    })
  },

  // ~90 KB of names that change only when a new Pokémon is released, and the source of every search.
  // Keeping it fresh and cached for an hour means typing never triggers a request and leaving the
  // search does not throw the download away (default gcTime is 5 minutes).
  names: () =>
    queryOptions({
      queryKey: [...pokemonQueries.all(), 'names'] as const,
      queryFn: ({ signal }) => fetchAllPokemon(signal),
      staleTime: HOUR_MS,
      gcTime: HOUR_MS,
    }),
}
