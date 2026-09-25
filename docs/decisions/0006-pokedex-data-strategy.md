# 0006 — Pokédex data strategy: pagination, search, prefetch and cache

## Problem

PokéAPI's list endpoint returns only `{ name, url }`, has no search, and has ~1.3k entries; the detail endpoint is 30–300 KB.
Naive approaches would either fire one request per card (N+1), one per keystroke, or block the first paint on a large download.
The screens also must stay honest when requests fail: a failed refresh should not throw away data the user is looking at.

## Solution

- **Browsing is server-paginated** (`limit=20&offset=…`), with the page number in the URL (`?page=2`), so pages are shareable,
  and back/forward work. Cards are rendered from list data only (id parsed from the URL inside the Zod schema): no N+1.
- **Search is client-side.** One request with `limit=100000` returns every name (~90 KB); it is fetched the first time the user
  types, kept fresh for 1 h and cached for 1 h (`staleTime`/`gcTime`), and filtered in memory. Typing causes no requests, and
  leaving the search does not discard the download (default `gcTime` is 5 min). The term is in the URL (`?q=`).
- **Placeholder data while paging** (`keepPreviousData`): the previous page stays on screen, marked `aria-busy` and dimmed, instead of
  flashing a skeleton.
- **Prefetch the next page** after the current one settles, and **prefetch a Pokémon on hover/focus**.
- **Query definitions in one place** (`api/shared/pokemonQueries.ts`, `queryOptions`): hooks, prefetching and invalidation share
  the same keys and functions.
- **`QueryView`** renders every query state once, for every page: pending skeleton; offline ("waiting for a connection", the query is
  _paused_, not failed); error specific to its kind with retry; and **data + failed background refresh → keep showing the data with a
  "could not refresh, may be stale" notice and a retry**.
- **Default `staleTime` 60 s** (`api/queryClient.ts`). PokéAPI answers with `Cache-Control: max-age=86400`, so the browser's HTTP cache
  already serves repeated requests for a day; a short in-memory `staleTime` costs almost nothing when it triggers a refetch, and it
  keeps stale-while-revalidate behavior observable.

## Why this approach

Each choice removes a specific failure or cost: N+1 requests, request-per-keystroke, layout flash on paging, losing data on a failed
refresh, and pointless re-downloads. Server pagination (rather than loading all names for browsing too) keeps first paint small and
gives real per-page requests to observe in the Reliability Lab (retries, cancellation, deduplication).

## Alternatives

- Load all names once for both browsing and search: simplest, but one 90 KB request gates the first paint and the Lab would have a
  single request to observe.
- Server-side search: impossible, the API has none.
- `useInfiniteQuery`: keeps every page in memory and loses shareable page URLs; not needed for a 60-page catalogue.
- Debounced search: unnecessary since filtering is local.
- Prefetch everything visible: multiplies requests for data most users never open.

## Trade-offs

- **Prefetching next page** costs one extra small request per page view (wasted if the user leaves). Measure it in the request log:
  page views vs. requests for `offset=` values. It is skipped while a placeholder is showing and never surfaces errors.
- **Prefetch on hover** also fires on touch taps and when the pointer merely crosses cards; it is deduplicated by the query cache and
  the payload is one Pokémon.
- The search list includes alternate forms (e.g. "Pikachu Rock Star", ids > 10000), because the API's list does.
- Search filters by substring on the API's kebab-case names; localized names are not searchable.
- Two hooks (`browse`, `search`) are always mounted, one disabled: simple, at the cost of a filter re-run per render (≈1.3k items).

## How it is tested

`PokedexPage.test.tsx` (MSW, real routes): pagination + URL; out-of-range page; **next page is prefetched (no new request, no loading
state)**; previous page kept while loading; **superseded page request is aborted (`cancelled` in the request log)**; hover prefetch;
cache reuse when returning from a Pokémon; search makes one download and no per-keystroke requests; empty search; **500 → retries →
error → retry recovers**; malformed not retried; **stale data kept with a notice when refresh fails**; **offline → paused, no requests →
reconnect loads by itself**. `PokemonDetailPage.test.tsx`: content, pt-BR formatting, name normalization, 404 (no retry), 503 →
retry, malformed. Verified manually against the real PokéAPI (1351 Pokémon, detail with real payloads).
