# 0009 — Code-splitting the Reliability Lab route

## Problem

`vite build` flags the main chunk as larger than 500 kB after minification. Investigating what it is
made of (see ADR 0001 and 0007's bundle breakdowns) showed the Lab's own UI — scenario picker, request
log table, live probe, cache controls, expected/observed panels — accounts for ~19 KB of source by
itself, all of it shipped to every visitor even if they only ever browse the Pokédex.

## Solution

The `/lab` route is loaded with `React.lazy()` behind a `<Suspense>` boundary in `routes/index.tsx`,
instead of a static import. The fallback is a small `RouteFallback` component using the same
`role="status"` convention as `QueryView`'s loading state.

Measured with `vite build` (raw / gzip):

|                 | before                | after                                      |
| --------------- | --------------------- | ------------------------------------------ |
| main chunk      | 563.25 kB / 179.39 kB | 552.44 kB / 176.95 kB                      |
| `LabPage` chunk | —                     | 11.46 kB / 3.49 kB (loaded only on `/lab`) |

## Why this approach

`React.lazy` + a route-level `Suspense` boundary is the standard, zero-dependency way to split a route
in a Vite/React app; no library decision to make. The boundary sits above the route element rather than
inside `LabPage` itself, so `LabPage` stays a normal component with no knowledge that it is lazy-loaded.

## Alternatives

- Splitting `PokemonDetailPage` from `PokedexPage` too: rejected — both are the primary, immediately
  expected experience for most sessions, and would very likely load back-to-back anyway (browse → open
  a Pokémon), so the split would rarely save a real download, only add a loading flash.
- A bundler-level `chunkSizeWarningLimit` increase: hides the signal instead of acting on it.

## Trade-offs

- A visible (if brief) loading state on the first visit to `/lab` per session; cached by the browser
  after that.
- The main chunk is still flagged by the build warning (552 kB): it is dominated by React, React
  Router, Zod, Axios and TanStack Query — dependencies the Pokédex itself needs from the first paint,
  so splitting them further would not remove real work, only relocate it. That remaining size is
  accepted as the cost of the chosen stack (ADR 0001), not something this change was meant to fix.

## How it is tested

RTL tests that navigate to `/lab` (`routes.test.tsx`, `LabPage.test.tsx`) assert with `findBy*`
instead of `getBy*` on the first element they look for, since the route now resolves asynchronously.
Bundle sizes above were confirmed by reading `vite build`'s own output before and after.
