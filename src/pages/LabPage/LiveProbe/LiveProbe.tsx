import { pokemonSpriteUrl } from '@/api/shared/pokemonSprites'
import { QueryView } from '@/components/shared/QueryView/QueryView'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePokemon } from '@/hooks/usePokemon'
import { useI18n } from '@/i18n'
import { formatPokemonName } from '@/utils/formatPokemonName'

const PROBE_POKEMON = 'pikachu'

/** A real consumer of the app's own hook and QueryView: whatever the scenario does, this reacts like the app. */
export function LiveProbe() {
  const { t } = useI18n()
  const query = usePokemon(PROBE_POKEMON)

  return (
    <Card className="gap-3">
      <CardHeader>
        <h2 className="font-semibold">{t('lab.probe.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('lab.probe.description')}</p>
      </CardHeader>
      <CardContent>
        <QueryView query={query} loading={<Skeleton className="h-24 rounded-lg" aria-hidden />}>
          {(pokemon) => (
            <div className="flex items-center gap-4">
              <img
                src={pokemonSpriteUrl(pokemon.id)}
                alt=""
                width={96}
                height={96}
                className="[image-rendering:pixelated]"
              />
              <div>
                <p className="font-medium">{formatPokemonName(pokemon.name)}</p>
                <ul className="mt-1 flex gap-2">
                  {pokemon.types.map(({ type }) => (
                    <li key={type.name}>
                      <Badge variant="secondary">{type.name}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </QueryView>
      </CardContent>
    </Card>
  )
}
