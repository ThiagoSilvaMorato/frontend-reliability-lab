import { Link } from 'react-router'
import { pokemonSpriteUrl } from '@/api/shared/pokemonSprites'
import { Card } from '@/components/ui/card'
import type { PokemonListItem } from '@/models/pokemon'
import { formatPokemonName } from '@/utils/formatPokemonName'
import { usePrefetchPokemon } from '../hooks/usePrefetchPokemon'

interface PokemonCardProps {
  pokemon: PokemonListItem
  /** Query string of the list being browsed, so "back" returns to the same page/search. */
  listSearch: string
}

export function PokemonCard({ pokemon, listSearch }: PokemonCardProps) {
  const prefetch = usePrefetchPokemon()

  return (
    <li>
      <Link
        to={`/pokemon/${pokemon.name}`}
        state={{ from: listSearch }}
        onPointerEnter={() => prefetch(pokemon.name)}
        onFocus={() => prefetch(pokemon.name)}
        className="block rounded-xl"
      >
        <Card className="hover:bg-accent items-center gap-1 py-4 transition-colors">
          <img
            src={pokemonSpriteUrl(pokemon.id)}
            alt=""
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="[image-rendering:pixelated]"
          />
          <span className="text-muted-foreground text-xs">
            #{String(pokemon.id).padStart(4, '0')}
          </span>
          <span className="font-medium">{formatPokemonName(pokemon.name)}</span>
        </Card>
      </Link>
    </li>
  )
}
