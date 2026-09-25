import { useSearchParams } from 'react-router'
import { QueryView } from '@/components/shared/QueryView/QueryView'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { PAGE_SIZE, usePokedex, type PokedexView } from './hooks/usePokedex'
import { Pagination } from './Pagination/Pagination'
import { PokemonCard } from './PokemonCard/PokemonCard'
import { SearchBox } from './SearchBox/SearchBox'

function parsePage(value: string | null) {
  const page = Number.parseInt(value ?? '', 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

const GRID = 'mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'

function GridSkeleton() {
  return (
    <div className={GRID} aria-hidden>
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <Skeleton key={index} className="h-40 rounded-xl" />
      ))}
    </div>
  )
}

export function PokedexPage() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const searchText = params.get('q') ?? ''
  const page = parsePage(params.get('page'))
  const { query, searching, showingPreviousPage } = usePokedex({ page, query: searchText })

  function goToPage(next: number) {
    const updated = new URLSearchParams(params)
    if (next <= 1) updated.delete('page')
    else updated.set('page', String(next))
    setParams(updated)
  }

  function search(text: string) {
    const updated = new URLSearchParams(params)
    if (text === '') updated.delete('q')
    else updated.set('q', text)
    updated.delete('page')
    // Each keystroke replaces the entry (no history spam); flushSync keeps the controlled input in sync.
    setParams(updated, { replace: true, flushSync: true })
  }

  function renderView({ items, total }: PokedexView) {
    if (items.length === 0) {
      return searching && total === 0 ? (
        <EmptyState
          title={t('pokedex.noMatches.title')}
          description={t('pokedex.noMatches.description', { query: searchText.trim() })}
          action={t('pokedex.noMatches.clear')}
          onAction={() => search('')}
        />
      ) : (
        <EmptyState
          title={t('pokedex.outOfRange.title')}
          description={t('pokedex.outOfRange.description', { page })}
          action={t('pokedex.outOfRange.first')}
          onAction={() => goToPage(1)}
        />
      )
    }

    const listSearch = params.toString() ? `?${params.toString()}` : ''
    return (
      <>
        <p className="text-muted-foreground mt-4 text-sm">{t('pokedex.count', { count: total })}</p>
        <ul
          className={`${GRID} transition-opacity ${showingPreviousPage ? 'opacity-60' : ''}`}
          aria-busy={showingPreviousPage}
        >
          {items.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} listSearch={listSearch} />
          ))}
        </ul>
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          onPageChange={goToPage}
        />
      </>
    )
  }

  return (
    <>
      <title>{`${t('pages.pokedex.title')} · ${t('app.name')}`}</title>
      <h1 className="text-2xl font-semibold">{t('pages.pokedex.title')}</h1>
      <p className="text-muted-foreground mt-2 mb-6">{t('pages.pokedex.description')}</p>
      <SearchBox value={searchText} onChange={search} />
      <QueryView query={query} loading={<GridSkeleton />}>
        {renderView}
      </QueryView>
    </>
  )
}

function EmptyState(props: {
  title: string
  description: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="mt-8 max-w-md">
      <h2 className="text-lg font-semibold">{props.title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{props.description}</p>
      <Button variant="outline" className="mt-4" onClick={props.onAction}>
        {props.action}
      </Button>
    </div>
  )
}
