import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useI18n, type MessageKey } from '@/i18n'
import type { Pokemon } from '@/models/pokemon'
import { formatPokemonName } from '@/utils/formatPokemonName'
import { statPercent, tenthsToUnit } from '../utils/measurements'

// A closed, typed set; anything PokéAPI adds later falls back to its raw name instead of a missing key.
const STAT_LABELS = {
  hp: 'stats.hp',
  attack: 'stats.attack',
  defense: 'stats.defense',
  'special-attack': 'stats.special-attack',
  'special-defense': 'stats.special-defense',
  speed: 'stats.speed',
} as const satisfies Record<string, MessageKey>

function isKnownStat(name: string): name is keyof typeof STAT_LABELS {
  return name in STAT_LABELS
}

export function PokemonDetail({ pokemon }: { pokemon: Pokemon }) {
  const { t, locale } = useI18n()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const artwork =
    pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          {artwork ? (
            <img
              src={artwork}
              alt=""
              width={192}
              height={192}
              decoding="async"
              className="size-48"
            />
          ) : (
            <div className="bg-muted size-48 rounded-xl" aria-hidden />
          )}
          <div>
            <p className="text-muted-foreground text-sm">#{String(pokemon.id).padStart(4, '0')}</p>
            <h1 className="text-3xl font-semibold">{formatPokemonName(pokemon.name)}</h1>
            <ul aria-label={t('detail.types')} className="mt-3 flex flex-wrap gap-2">
              {pokemon.types.map(({ type }) => (
                <li key={type.name}>
                  <Badge variant="secondary">{type.name}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="facts">
          <h2 id="facts" className="sr-only">
            {t('detail.height')} / {t('detail.weight')}
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t('detail.height')}</dt>
            <dd>{t('detail.meters', { value: number.format(tenthsToUnit(pokemon.height)) })}</dd>
            <dt className="text-muted-foreground">{t('detail.weight')}</dt>
            <dd>{t('detail.kilograms', { value: number.format(tenthsToUnit(pokemon.weight)) })}</dd>
            {pokemon.base_experience !== null && (
              <>
                <dt className="text-muted-foreground">{t('detail.baseExperience')}</dt>
                <dd>{pokemon.base_experience}</dd>
              </>
            )}
          </dl>

          <h2 className="mt-6 mb-2 font-semibold">{t('detail.abilities')}</h2>
          <ul className="space-y-1 text-sm">
            {pokemon.abilities.map(({ ability, is_hidden }) => (
              <li key={ability.name}>
                {formatPokemonName(ability.name)}
                {is_hidden && (
                  <span className="text-muted-foreground"> ({t('detail.hidden')})</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="stats">
          <h2 id="stats" className="mb-2 font-semibold">
            {t('detail.stats')}
          </h2>
          <ul className="space-y-2">
            {pokemon.stats.map(({ stat, base_stat }) => (
              <li
                key={stat.name}
                className="grid grid-cols-[6rem_2rem_1fr] items-center gap-3 text-sm"
              >
                <span>{isKnownStat(stat.name) ? t(STAT_LABELS[stat.name]) : stat.name}</span>
                <span className="tabular-nums">{base_stat}</span>
                {/* The number is the accessible value; the bar is a visual aid only. */}
                <span className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
                  <span
                    className="bg-primary block h-full rounded-full"
                    style={{ width: `${statPercent(base_stat)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  )
}
