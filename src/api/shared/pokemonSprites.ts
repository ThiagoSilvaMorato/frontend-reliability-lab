// Sprites are static images from the PokéAPI sprites repository, addressed by id. They are not API
// calls (no JSON, no reliability concerns), so they bypass the HTTP client and MSW.
const SPRITES_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export function pokemonSpriteUrl(id: number): string {
  return `${SPRITES_BASE}/${id}.png`
}
