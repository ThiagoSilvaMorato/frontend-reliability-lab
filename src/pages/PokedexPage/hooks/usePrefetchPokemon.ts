import { useQueryClient } from '@tanstack/react-query'
import { pokemonQueries } from '@/api/shared/pokemonQueries'

/**
 * Warms the cache when the user shows intent (hover/focus), so opening the Pokémon is usually
 * instant. Prefetch failures are silent by design: the real request happens on navigation.
 */
export function usePrefetchPokemon() {
  const queryClient = useQueryClient()
  return (name: string) => {
    void queryClient.prefetchQuery(pokemonQueries.detail(name))
  }
}
