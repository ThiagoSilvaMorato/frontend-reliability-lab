# 0001 — Stack and architecture review

## Problem

The initial stack and folder layout were proposed before any code existed. Some pieces are redundant for the goal
(demonstrate reliability behavior), some are missing (runtime validation, styling, i18n strategy), and a few interact
in non-obvious ways (MSW running in a production build, TanStack Query cache hiding failures).

## Solution

Keep the proposed stack with the additions and changes below.

| Item               | Decision                                                                                         | Reason                                                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zod**            | Add                                                                                              | TypeScript cannot validate external data. Needed for the `malformed` scenario. Types are inferred from schemas (`z.infer`), so schema and type cannot drift.                                                                                                                                        |
| **Axios**          | Keep                                                                                             | Fetch + `AbortSignal.timeout` is enough for basic calls, but Axios gives a first-class timeout error code, interceptors (telemetry, error normalization) and consistent `AbortSignal` support in one place. It is ~13 kB gz; acceptable. Everything is behind `api/index.ts`, so it is replaceable. |
| **TanStack Query** | Keep                                                                                             | Owns all server state. `networkMode: 'online'` (default) is kept on purpose: offline queries _pause_ and resume on reconnect (`fetchStatus: 'paused'`), which is the offline demo.                                                                                                                  |
| **React Router**   | Keep                                                                                             | Only 3–4 routes, but deep-linking a Pokémon and a shareable `?scenario=` are real requirements. Loaders are **not** used: data fetching stays in TanStack Query.                                                                                                                                    |
| **MSW**            | Keep, one handler set                                                                            | The same handlers run in the browser (service worker), Vitest (node) and Playwright (browser). Scenario is read from a store by a single handler set, instead of swapping handlers at runtime. Loaded lazily.                                                                                       |
| **Styling**        | CSS Modules + CSS custom properties (no dependency)                                              | Palette is a small set of tokens; Vite supports CSS Modules natively. Tailwind/CSS-in-JS would add a dependency without demonstrating anything relevant here.                                                                                                                                       |
| **i18n**           | Small typed in-house module, no library                                                          | Two languages, no ICU/plural complexity beyond `Intl.PluralRules`. Keys typed from `en.json`. Revisit only if interpolation/plural needs grow.                                                                                                                                                      |
| **Error Boundary** | Own ~25-line class component                                                                     | Avoids a dependency for something React documents. Integrates with `QueryErrorResetBoundary`.                                                                                                                                                                                                       |
| **Test helpers**   | Add `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`                          | Realistic interactions (typing, keyboard) and readable a11y-oriented assertions.                                                                                                                                                                                                                    |
| **ESLint plugins** | Add `jsx-a11y`, `react-hooks`, `@tanstack/eslint-plugin-query`                                   | Accessibility is a stated priority; the query plugin catches missing keys/deps and unstable client creation.                                                                                                                                                                                        |
| **Not added**      | Zustand/Redux, TanStack Query Devtools, `web-vitals` (for now), `react-error-boundary`, Tailwind | No shared client state that justifies a store (Lab state is a tiny `useSyncExternalStore` module). `web-vitals` is decided when the performance step starts.                                                                                                                                        |

Architecture additions to the proposed layout (each with a reason):

- `src/mocks/` — MSW handlers, scenario engine, worker/server setup. Does not fit `api/` (it is not the app's HTTP layer) nor `utils/`.
- `src/observability/` — request telemetry store. Written by the HTTP client, read by the Lab; cross-cutting, so not owned by `api/shared` or a page.
- `src/api/queryClient.ts` — retry policy and cache defaults are reliability core and belong next to the HTTP client.
- `models/` also holds Zod schemas (types inferred), not just types.
- `docs/decisions/` — ADRs. `e2e/` — Playwright specs.
- Extra scenarios beyond the minimum: **Offline (simulated)** (drives `onlineManager`) and **Flaky (fails N times then recovers)** (deterministic retry/recovery demo).

Issues identified up front:

1. **PokéAPI list returns only `name` + `url`.** Rendering rich cards would cause N+1 requests. Cards use the list data only (id parsed from URL); details are fetched on the detail page and prefetched on hover/focus.
2. **PokéAPI has no search endpoint.** Name search filters the full name list (one cached request, long `staleTime`) client-side.
3. **MSW in a public build is unusual.** It is intentional here (Lab is a product feature), started lazily only when a non-Normal scenario is chosen, with `onUnhandledRequest: 'bypass'`. The _Normal_ scenario uses the real PokéAPI.
4. **Cache can hide failures.** After changing scenario the app might keep showing cached data. The Lab exposes "reset cache" and shows when data is stale/served from cache.
5. **MSW worker start is async.** Requests fired before it is ready would hit the real API. The scenario switch awaits worker readiness before refetching.
6. **Timeouts in tests.** Timeout and backoff values are injected so tests run in milliseconds.
7. **Muted text `#94A3B8` on white fails WCAG AA (≈2.6:1).** Kept as a token per the design brief but restricted to non-essential text; a darker derived token is used for readable secondary text.
8. **Optimistic updates:** PokéAPI is read-only; none will be implemented. Favorites (if added) live in `localStorage`, which is not server state.

## Why this approach

Every addition is tied to a scenario the Lab demonstrates or a stated quality goal (a11y, runtime validation). Every removal or
"not added" avoids a dependency with no demonstrable value.

## Alternatives

- `fetch` instead of Axios: less weight, but the timeout/interceptor/normalization code would be hand-written.
- Tailwind: faster styling, but a dependency and less obviously tied to the palette-as-tokens requirement.
- `react-i18next`: solid, but heavy for two languages and ~100 strings.
- Swapping MSW handlers per scenario (`worker.use`): more idiomatic but harder to make deterministic and to expose state to the Lab UI.

## Trade-offs

- In-house i18n and error boundary are code we own and must test.
- Shipping MSW to users increases the number of moving parts (service worker registration) in production.
- Axios adds bundle weight versus fetch.

## How it is tested

Not a behavior; validated by the steps that implement each item. Each later ADR (retry policy, error taxonomy, MSW strategy)
carries its own "How it is tested".

## Incremental plan

1. **Scaffold & tooling** — Vite, strict TS, ESLint, Prettier, Vitest/RTL, tokens, folder skeleton, `npm run check`.
2. **API foundation** — `ApiError` model, Axios client, telemetry interceptor, Zod schemas, Pokémon API functions, `queryClient` + retry policy, MSW node server; unit tests. ADRs: error taxonomy, retry policy.
3. **UI foundation** — `ui/` primitives, i18n, app shell, router, error boundary.
4. **Pokédex** — list (pagination, prefetch), detail, search; loading/error/empty/success; offline banner.
5. **Reliability Lab** — scenario engine, browser worker, Lab page (expected vs observed, request log, recovery), RTL tests per scenario. ADR: MSW strategy.
6. **E2E** — Playwright reliability flows.
7. **Performance & observability polish** — measured optimizations, Web Vitals decision, cancellation/race-condition demos.
8. **README + remaining ADRs.**
