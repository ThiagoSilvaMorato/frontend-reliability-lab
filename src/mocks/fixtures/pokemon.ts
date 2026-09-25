import { POKEAPI_BASE_URL } from '@/api/config'
import type { Pokemon } from '@/models/pokemon'

function resource(kind: string, name: string, id: number) {
  return { name, url: `${POKEAPI_BASE_URL}/${kind}/${id}/` }
}

function buildPokemon(id: number, name: string, types: string[]): Pokemon {
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

export const pokemonFixtures: Pokemon[] = [
  buildPokemon(1, 'bulbasaur', ['grass', 'poison']),
  buildPokemon(4, 'charmander', ['fire']),
  buildPokemon(25, 'pikachu', ['electric']),
]
