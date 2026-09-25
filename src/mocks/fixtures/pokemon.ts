import { POKEAPI_BASE_URL } from '@/api/config'
import type { Pokemon } from '@/models/pokemon'

// The first 60 Pokémon in Pokédex order: array index + 1 is the id, like the real API.
const NAMES = [
  ...'bulbasaur ivysaur venusaur charmander charmeleon charizard squirtle wartortle blastoise'.split(
    ' ',
  ),
  ...'caterpie metapod butterfree weedle kakuna beedrill pidgey pidgeotto pidgeot rattata raticate'.split(
    ' ',
  ),
  ...'spearow fearow ekans arbok pikachu raichu sandshrew sandslash nidoran-f nidorina nidoqueen'.split(
    ' ',
  ),
  ...'nidoran-m nidorino nidoking clefairy clefable vulpix ninetales jigglypuff wigglytuff zubat'.split(
    ' ',
  ),
  ...'golbat oddish gloom vileplume paras parasect venonat venomoth diglett dugtrio meowth persian'.split(
    ' ',
  ),
  ...'psyduck golduck mankey primeape growlithe arcanine poliwag'.split(' '),
]

const TYPES: Record<string, string[]> = {
  bulbasaur: ['grass', 'poison'],
  charmander: ['fire'],
  pikachu: ['electric'],
}

function resource(kind: string, name: string, id: number) {
  return { name, url: `${POKEAPI_BASE_URL}/${kind}/${id}/` }
}

function buildPokemon(id: number, name: string): Pokemon {
  const types = TYPES[name] ?? ['normal']
  return {
    id,
    name,
    base_experience: 64,
    height: 7,
    weight: 69,
    abilities: [{ is_hidden: false, slot: 1, ability: resource('ability', 'overgrow', 65) }],
    types: types.map((type, index) => ({
      slot: index + 1,
      type: resource('type', type, index + 1),
    })),
    stats: [
      { base_stat: 45, stat: resource('stat', 'hp', 1) },
      { base_stat: 49, stat: resource('stat', 'attack', 2) },
    ],
    sprites: { front_default: null },
  }
}

export const pokemonFixtures: Pokemon[] = NAMES.map((name, index) => buildPokemon(index + 1, name))

export function pokemonFixture(name: string): Pokemon {
  const found = pokemonFixtures.find((pokemon) => pokemon.name === name)
  if (!found) throw new Error(`no fixture named ${name}`)
  return found
}
