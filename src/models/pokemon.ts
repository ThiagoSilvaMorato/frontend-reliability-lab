import { z } from 'zod'

/*
 * These schemas describe what the app CONSUMES from PokéAPI, not a mirror of the API.
 * Shapes were checked against real responses (see src/mocks/fixtures/real and pokemon.test.ts).
 *
 * `GET /pokemon/:id` is ~30–300 KB, mostly `moves`, `game_indices`, `sprites.versions` and `past_*`.
 * Those are deliberately absent: Zod strips unknown keys, and every extra field we validate is one more
 * way to reject a good response as `malformed` for something the UI never reads.
 *
 * Nullability follows real data: `base_experience` is null for some forms (e.g. hawlucha-mega),
 * sprite URLs are nullable in the API contract.
 */
const namedResourceSchema = z.object({ name: z.string().min(1), url: z.string() })

const POKEMON_URL_ID = /\/pokemon\/(\d+)\/?$/

/**
 * The list endpoint only returns `{ name, url }`; the numeric id lives in the URL. It is extracted here,
 * once, so nothing else needs to know the URL shape. A URL without an id makes the response `malformed`.
 */
const pokemonSummarySchema = namedResourceSchema.transform(({ name, url }, ctx) => {
  const id = POKEMON_URL_ID.exec(url)?.[1]
  if (id === undefined) {
    ctx.issues.push({ code: 'custom', message: `no pokemon id in url "${url}"`, input: url })
    return z.NEVER
  }
  return { id: Number(id), name }
})

export const pokemonListSchema = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(pokemonSummarySchema),
})

export const pokemonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  base_experience: z.number().int().nullable(),
  height: z.number(),
  weight: z.number(),
  abilities: z.array(
    z.object({
      is_hidden: z.boolean(),
      slot: z.number().int(),
      ability: namedResourceSchema,
    }),
  ),
  types: z.array(z.object({ slot: z.number().int(), type: namedResourceSchema })),
  stats: z.array(z.object({ base_stat: z.number(), stat: namedResourceSchema })),
  sprites: z.object({
    front_default: z.string().nullable(),
    other: z
      .object({
        'official-artwork': z.object({ front_default: z.string().nullable() }).optional(),
      })
      .optional(),
  }),
})

export type PokemonList = z.infer<typeof pokemonListSchema>
export type PokemonListItem = PokemonList['results'][number]
export type Pokemon = z.infer<typeof pokemonSchema>
