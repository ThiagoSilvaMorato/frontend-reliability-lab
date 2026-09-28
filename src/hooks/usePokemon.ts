import { useQuery } from '@tanstack/react-query'
import { pokemonQueries } from '@/api/shared/pokemonQueries'

export function usePokemon(name: string) {
  return useQuery(pokemonQueries.detail(name))
}
