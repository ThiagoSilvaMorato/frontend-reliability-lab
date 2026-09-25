import { describe, expect, it } from 'vitest'
import { formatPokemonName } from './formatPokemonName'

describe('formatPokemonName', () => {
  it.each([
    ['pikachu', 'Pikachu'],
    ['mr-mime', 'Mr Mime'],
    ['nidoran-f', 'Nidoran F'],
    ['', ''],
  ])('%s → %s', (name, expected) => {
    expect(formatPokemonName(name)).toBe(expected)
  })
})
