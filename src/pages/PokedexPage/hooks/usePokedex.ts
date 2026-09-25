import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { pokemonQueries } from '@/api/shared/pokemonQueries'
import type { PokemonListItem } from '@/models/pokemon'

export const PAGE_SIZE = 20

export interface PokedexView {
  items: PokemonListItem[]
  total: number
}

interface PokedexParams {
  page: number
  query: string
}

/**
 * Two sources behind one view. Browsing asks the server for one page at a time (small responses,
 * shareable page number). Searching filters the full name list in memory: PokéAPI has no search
 * endpoint, and one cached download means typing never causes a request.
 */
export function usePokedex({ page, query }: PokedexParams) {
  const term = query.trim().toLowerCase()
  const searching = term !== ''
  const queryClient = useQueryClient()
  const start = (page - 1) * PAGE_SIZE

  const browse = useQuery({
    ...pokemonQueries.list({ limit: PAGE_SIZE, offset: start }),
    enabled: !searching,
    // Keep the previous page on screen while the next one loads instead of flashing a skeleton.
    placeholderData: keepPreviousData,
    select: (data): PokedexView => ({ items: data.results, total: data.count }),
  })

  const search = useQuery({
    ...pokemonQueries.names(),
    enabled: searching,
    select: (all): PokedexView => {
      const matches = all.filter((pokemon) => pokemon.name.includes(term))
      return { items: matches.slice(start, start + PAGE_SIZE), total: matches.length }
    },
  })

  // Prefetch the next page once the current one is settled: turns the most likely click into a cache hit
  // at the cost of one extra small request per page view. Skipped while a page is still a placeholder.
  const hasNextPage = page * PAGE_SIZE < (browse.data?.total ?? 0)
  const settled = browse.isSuccess && !browse.isPlaceholderData
  useEffect(() => {
    if (searching || !settled || !hasNextPage) return
    void queryClient.prefetchQuery(
      pokemonQueries.list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    )
  }, [queryClient, searching, settled, hasNextPage, page])

  return {
    query: searching ? search : browse,
    searching,
    showingPreviousPage: !searching && browse.isPlaceholderData,
  }
}
