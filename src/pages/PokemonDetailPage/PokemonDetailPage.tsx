import { Link, useLocation, useParams } from 'react-router'
import { QueryView } from '@/components/shared/QueryView/QueryView'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { formatPokemonName } from '@/utils/formatPokemonName'
import { usePokemon } from './hooks/usePokemon'
import { PokemonDetail } from './PokemonDetail/PokemonDetail'
import { readBackSearch } from './utils/measurements'

export function PokemonDetailPage() {
  const { t } = useI18n()
  const { name = '' } = useParams()
  const location = useLocation()
  const query = usePokemon(name)

  return (
    <>
      <title>{`${formatPokemonName(name)} · ${t('app.name')}`}</title>
      <Link
        to={{ pathname: '/', search: readBackSearch(location.state) }}
        className="text-muted-foreground mb-4 inline-block text-sm underline underline-offset-4"
      >
        {t('detail.back')}
      </Link>
      <QueryView query={query} loading={<Skeleton className="h-96 rounded-xl" aria-hidden />}>
        {(pokemon) => <PokemonDetail pokemon={pokemon} />}
      </QueryView>
    </>
  )
}
