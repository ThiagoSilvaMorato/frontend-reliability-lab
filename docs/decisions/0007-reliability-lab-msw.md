# 0007 — Reliability Lab: one MSW handler set, a pure scenario engine, loaded on demand

## Problem

The Lab must show how the real app behaves under adverse conditions, so the app cannot have a separate "demo mode" code path.
The failures also have to be reproducible (same behavior for the same link), observable (what was expected vs. what happened),
and must not cost normal users anything: no mock library in their bundle, no interception of their requests.

## Solution

- **The behavior of every scenario is a pure function** (`mocks/scenarios/engine.ts`): `decide(runtime, requestKey) → proceed | corrupt |
respond(status) | network-error | hang`. It has no MSW dependency, so it is unit-tested directly, and the random scenario uses a
  seeded PRNG (mulberry32): same seed, same sequence. Sequences for seeds 1, 7 and 42 are pinned in tests, so changing the PRNG or the
  draw order, which would silently change every shared link, is a deliberate edit.
- **One handler set** (`mocks/handlers.ts`, `createHandlers(upstream)`) interprets those decisions. Only `upstream`, what "healthy"
  means, differs by environment: fixtures in tests (Vitest and the RTL suites), the real PokéAPI in the browser (`fetch(bypass(request))`).
  The scenario logic cannot drift between them, and tests exercise the same handlers the worker uses.
- **Scenarios**: the eight required (Normal, Slow, Timeout, HTTP 404, HTTP 500, Network error, Malformed, Random) plus **Flaky** (each
  URL fails twice, then works: what the retry policy absorbs) and **Offline (simulated)** (drives TanStack Query's `onlineManager`, so
  queries pause exactly as when the connection is lost; no worker needed).
- **On demand**: `mocks/scenarios/*` (definitions, store) has no MSW import and is safe for the main bundle; `mocks/browser.ts` is
  loaded with a dynamic `import()` only when a scenario needs interception. It lands in its own chunk (~423 kB, ~159 kB gzip). The scenario wiring
  (engine, store, controller) added ~2 kB to the main bundle; the Lab page UI itself added ~20 kB more (main: 543 → 563 kB, 174 → 179 kB gzip). **Normal and Offline start no worker.** Returning to Normal stops it, so Normal is the production request path.
- **Shareable**: `?scenario=…&seed=…` is applied **before the first render** (`initLabFromUrl` in `main.tsx`), so the first request
  already meets the scenario. The Lab page keeps the URL in sync with what is running.
- **Order of operations** when switching (`applyScenario`): start the worker → activate the scenario → restore connectivity. In-flight
  queries are cancelled first so their cancellations do not land in the new scenario's log. A newer selection supersedes one that is
  still loading.
- **Cache honesty**: cached data would answer instead of the new scenario, so "reset cached data on change" is on by default, visible,
  and can be turned off to observe stale data with a failed refresh; "Reset cache" and "Refetch" are explicit buttons.
- **Observation**: expected behavior (text per scenario, in both languages) next to what was observed: request count by outcome, automatic
  retries (counted at the QueryCache boundary), average duration, recovery ("succeeded after N failed attempts"), connectivity and query
  states, plus a request log. A live probe renders the app's own hook and `QueryView`, and a header indicator shows on every page that a
  simulation is active.

## Why this approach

A pure engine is the only way to make "deterministic and reproducible" a tested property rather than a claim. A single handler set
with an injected upstream is the smallest design in which the browser and the tests cannot disagree. Loading MSW on demand keeps a
demo tool out of the path of anyone using the app normally.

## Alternatives

- Swapping handlers per scenario (`worker.use`): idiomatic, but the active scenario would be hidden inside MSW, hard to expose to the UI
  and to seed.
- A separate "lab client" or toggles inside the API layer: puts test code in production and breaks "the app is the same".
- Always starting the worker (passthrough for Normal): simpler, but Normal would no longer be the real request path.
- Modelling offline by blocking requests: the real behavior worth showing is queries pausing, which needs `onlineManager`.

## Trade-offs

- A service worker is a real moving part in a public build: it needs a secure context, and can fail to register (the Lab says so and
  stays in Normal).
- **Healthy responses pass through `fetch` again** in the browser (re-wrapped without `Content-Encoding`), so the "real" path is
  intercepted and re-served: one extra hop, and a Timeout scenario really takes ~21 s (3 × 6 s + backoff).
- Random scenario order depends on request order; concurrent requests may interleave differently between runs, so exact reproduction
  is guaranteed for the same sequence of requests, not for arbitrary timing.
- In development, React StrictMode mounts effects twice, so one aborted request appears as "Cancelled" in the log; production does not.
- `Offline (simulated)` proves the paused-query path, not a real `navigator.onLine` change (covered separately in tests and E2E).

## How it is tested

- `engine.test.ts`: every scenario's decision, flaky per-URL counting, random reproducibility, pinned sequences, failure share (~50 %).
- `scenarios.test.ts`: each scenario through the real HTTP client and the shared handlers (404 → `http 404`, timeout → `timeout`,
  malformed → 200 with `malformed`, flaky 503/503/200, same seed → same outcomes).
- `lab.test.ts`, `params.test.ts`: worker on demand and stopped on Normal, activation order, offline without a worker, superseded
  selections, worker failure falls back to Normal, URL parsing and round-trip.
- `LabPage.test.tsx`: every scenario end to end in the UI (expected vs. observed, log, retries, recovery), the real Pokédex reacting
  to a scenario, stale data with cache reset off, shareable URL and seed replay, both languages.
- Verified manually in a real browser with the actual service worker: shared link before first render, HTTP 500, Malformed (real body
  corrupted), Flaky recovery, and a real 3 × 6 s Timeout; Playwright E2E follows in the next step.
