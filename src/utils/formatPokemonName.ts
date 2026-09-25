/** "mr-mime" → "Mr Mime", "nidoran-f" → "Nidoran F". */
export function formatPokemonName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
