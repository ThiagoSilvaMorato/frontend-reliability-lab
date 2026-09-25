import { describe, expect, it } from 'vitest'
import bulbasaur from '@/mocks/fixtures/real/bulbasaur.json'
import hawluchaMega from '@/mocks/fixtures/real/hawlucha-mega.json'
import pokemonPage from '@/mocks/fixtures/real/pokemon-list.json'
import { pokemonListSchema, pokemonSchema } from './pokemon'

// Contract tests: the JSON files are real PokéAPI responses captured on 2026-09-25
// (only the unused bulk — moves, game_indices, sprites.versions — was removed).
describe('pokemon schemas against real PokéAPI responses', () => {
  it('accepts a real list page', () => {
    const page = pokemonListSchema.parse(pokemonPage)
    expect(page.count).toBeGreaterThan(1000)
    expect(page.previous).toBeNull()
    expect(page.next).toContain('offset=2')
    expect(page.results[0]).toEqual({ id: 1, name: 'bulbasaur' })
  })

  it('rejects a list item whose url has no Pokémon id', () => {
    const broken = {
      ...pokemonPage,
      results: [{ name: 'x', url: 'https://pokeapi.co/api/v2/pokemon/' }],
    }
    expect(pokemonListSchema.safeParse(broken).success).toBe(false)
  })

  it('accepts a real Pokémon and keeps only the fields the app consumes', () => {
    const pokemon = pokemonSchema.parse(bulbasaur)
    expect(pokemon).toMatchObject({ id: 1, name: 'bulbasaur', base_experience: 64 })
    expect(pokemon.types.map((t) => t.type.name)).toEqual(['grass', 'poison'])
    expect(pokemon.abilities.map((a) => a.ability.name)).toEqual(['overgrow', 'chlorophyll'])
    expect(pokemon.sprites.other?.['official-artwork']?.front_default).toContain('official-artwork')
    expect(pokemon).not.toHaveProperty('past_stats')
  })

  it('accepts a real form whose base_experience is null', () => {
    expect(pokemonSchema.parse(hawluchaMega).base_experience).toBeNull()
  })

  it('rejects a Pokémon missing a field the app depends on', () => {
    const withoutTypes: Record<string, unknown> = { ...bulbasaur }
    delete withoutTypes['types']
    expect(pokemonSchema.safeParse(withoutTypes).success).toBe(false)
  })
})
