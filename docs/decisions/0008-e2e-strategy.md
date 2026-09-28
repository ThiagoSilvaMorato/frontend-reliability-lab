# 0008 — E2E strategy: what needs a real browser

## Problem

The RTL suite (Vitest + jsdom) already exercises almost every reliability flow, but jsdom has no real network stack and no
real Service Worker. Two things in this app's own requirements literally cannot be proven there:

1. **A real connection loss.** jsdom cannot go offline; the RTL tests drive `onlineManager.setOnline(false)` directly — the
   app _told_ to behave as if offline, not the network actually failing. The brief's own flow ("connection is lost → offline
   state → connection recovers → app recovers") needs a real browser's `online`/`offline` events.
2. **The real MSW service worker**, registered, lazy-loaded, and intercepting exactly as it will for a real user — proven so
   far only by manual browser checks (Steps 4 and 5).

## Solution

Playwright, in `e2e/`, against a **production build** (`vite build && vite preview`), not the dev server: it is what users
get, and it is the only way to see the Lab's worker chunk load exactly as ADR 0007 describes (not part of the Normal-mode
bundle). One Chromium project; `npm run test:e2e` runs it, kept separate from `npm run check`.

Specs, by what they uniquely need a real browser for:

- `offline.spec.ts` — `context.setOffline(true/false)`: the one flow jsdom cannot produce.
- `reliability.spec.ts` — 500/404/network/timeout through a real registered worker, entirely deterministic: these scenarios
  answer or fail before reaching an upstream, so no outbound network is involved (see engine.ts: `respond`/`network-error`/
  `hang` never call `upstream`).
- `scenarios-against-real-api.spec.ts` — malformed/flaky/slow: these **do** call the real PokéAPI (their decision is
  `proceed`/`corrupt`, which the browser's `upstream` fulfills via `fetch(bypass(request))`). Kept in their own file, with
  that dependency stated up front, rather than hidden among the deterministic specs.
- `navigation.spec.ts` — keyboard focus, `history.back()`, a full page reload keeping the chosen language: real browser
  mechanics an RTL `render()` only approximates.

Not duplicated here: exact retry counts, deduplication, race conditions, cache reuse — already proven, faster, at the RTL
level (`PokedexPage.test.tsx`, `queryClient.test.ts`).

## Why this approach

Each spec exists because a real browser changes the answer, not to re-prove what Vitest already covers well. Accepting a
live PokéAPI dependency for a handful of specs matches what the app already does in the Normal scenario and in `proceed`/
`corrupt` decisions — intercepting those in Playwright too (`page.route`) would mean testing a third, artificial upstream
that does not exist in the app.

## Alternatives

- Run E2E against `vite dev`: faster to start, but does not prove the production chunking the Lab's lazy MSW load depends on.
- Mock the PokéAPI at the Playwright layer for every scenario (`page.route`): avoids the live dependency, but `proceed`/
  `corrupt` calling `fetch(bypass(request))` happens _inside_ the registered Service Worker; intercepting a Service Worker's
  own outgoing fetches from Playwright is unreliable across versions, so this was not pursued.
- Simulate offline via `onlineManager.setOnline(false)` in Playwright too: possible, but then nothing in the suite proves the
  real browser event path, defeating the point of adding Playwright for this flow specifically.

## Trade-offs

- `reliability.spec.ts`'s timeout test takes ~20s (3 real 6s timeouts + backoff) — accepted, since shortening the app's
  actual timeout only for this test would test a different value than production uses.
- `scenarios-against-real-api.spec.ts` needs outbound HTTPS to pokeapi.co; if that becomes a problem in some CI environment,
  those three specs are isolated in one file and easy to skip separately from the rest.
- `role="status"` is not a "name from content" ARIA role: an accessible name requires `aria-label`/`aria-labelledby`, so
  `getByRole('status', { name: … })` never matches text placed inside it (as in `QueryView`'s loading state) — a real finding
  from writing these specs, not a documented Playwright quirk. Tests match the role alone; nothing in the app changed, since
  the loading text is intentionally screen-reader-only inside an already-announced live region.

## How it is tested

This ADR describes the tests themselves. `npm run test:e2e` runs all 14 specs; run repeatedly (including `--repeat-each`) to
confirm no flakiness before relying on any of them.
