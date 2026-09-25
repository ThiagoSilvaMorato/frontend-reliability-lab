export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2'

// PokéAPI normally answers in well under a second. 6s leaves room for a cold cache on a slow
// connection while bounding the wait: worst case (3 attempts + backoff) is ~20s before an error is shown.
export const REQUEST_TIMEOUT_MS = 6_000
