# CLAUDE.md — Frontend Reliability Lab

These rules are **mandatory**. If a quick implementation conflicts with a rule here, follow the rule.
If a rule is wrong or blocks good engineering, say so and propose a change to this file — do not silently bypass it.

## Purpose

A Pokédex (PokéAPI) used as the **domain** for a **Reliability Lab**: a part of the product where the user
picks a failure scenario and observes how the frontend behaves (expected vs. observed, request log, recovery).
The product is the Lab, not the Pokédex. Every feature must demonstrate a relevant engineering decision
(reliability, performance, testing, observability, architecture). If it does not, prefer the simplest solution.

Primary audience of the repo: another frontend engineer reading the code. Code, comments, docs and commits are in **English**.
UI strings live in `src/i18n` (`en`, `pt-BR`).

## Before implementing anything

1. Ask: _does this demonstrate a relevant engineering decision, or only add complexity?_ If only complexity → do the simpler thing.
2. Search the codebase for something reusable (component, hook, util, api function, schema). Reuse before creating.
3. If an existing abstraction is not adequate, decide whether it should be changed **before** creating a parallel one.
4. Work in small, verifiable steps. After each relevant step run `npm run check` (typecheck + lint + relevant tests). Never stack broken code to fix later.
5. Do not change the architecture without explaining why (in the PR/commit message and, if relevant, an ADR).

## Stack

React 19 · TypeScript (strict) · Vite · TanStack Query · Axios · Zod · React Router · MSW · Vitest · React Testing Library · Playwright · ESLint · Prettier · Tailwind CSS v4.

Every new dependency must answer, in the commit/ADR: what problem it solves, whether it is simple to do without it,
the complexity it adds, and the engineering value it demonstrates. No libraries "for convenience".

## Architecture

```text
src/
├── components/
│   ├── ui/          # simple, reusable primitives (Button, Input, Badge, Card, ...)
│   └── shared/      # composed components built from ui/ and used by several pages
├── api/
│   ├── index.ts     # HTTP client (Axios) config: baseURL, timeout, interceptors
│   ├── queryClient.ts  # TanStack Query defaults + retry policy
│   └── shared/      # API functions shared across pages (fetch + Zod validation)
├── models/          # shared types AND Zod schemas (types are inferred from schemas)
├── pages/           # route-level components; page-specific hooks/utils/api live beside the page
├── routes/          # router definition
├── i18n/            # en.json, pt-BR.json, index.ts
├── mocks/           # MSW: handlers, scenarios engine, browser worker, node server (same handlers everywhere)
├── observability/   # request telemetry store consumed by the Lab UI
├── styles/          # tokens.css (design tokens) and global.css
├── test/            # test setup and shared test helpers (render with providers, MSW server)
├── hooks/           # ONLY hooks used by 2+ places
└── utils/           # ONLY utils used by 2+ places
```

- Data flow is strictly: `Component → Hook → API function → Response validation (Zod) → HTTP client → External API`.
- Components never import Axios, never know PokéAPI URLs or shapes, never know if a response came from PokéAPI or MSW.
- Feature-specific code stays next to its component/page (`PokemonCard/hooks`, `PokemonCard/utils`).
  Promote to `src/hooks` / `src/utils` only when a **second** consumer appears.
- Shared types/schemas live in `src/models`. Component-only prop types stay next to the component.
- No premature abstractions. Three similar lines beat a speculative helper.
- Files stay small and cohesive. When a file mixes distinct responsibilities, extract **only** along a real responsibility boundary — never to hit a line count.
- Use the `@/` alias for `src/`. No barrel files except `api/index.ts`-style entry points that are part of the design.

## Server state (TanStack Query)

- TanStack Query is the **only** owner of server state: data, loading, error, stale, cache, refetching.
  Never mirror them in `useState`/`useEffect`. No parallel cache or fetch-state mechanism without a documented technical reason.
- Query keys come from a single key factory per domain. `queryFn` must forward `signal` to the HTTP client (cancellation).
- `staleTime`, `gcTime`, `retry`, `retryDelay`, `networkMode` are reliability decisions: each non-default value needs a one-line justification next to it.
- Mutations / optimistic updates: only when there is a real mutable operation. PokéAPI is read-only, so **no optimistic updates** unless a real case appears
  (evaluate UX benefit, rollback, conflicts, local consistency, failure behavior). The decision not to use them is documented.

## Error model and retry policy

Errors are normalized once, at the HTTP client boundary, into a discriminated union `ApiError` (`src/models/api.ts`):

| kind                          | meaning                        | retry                                    |
| ----------------------------- | ------------------------------ | ---------------------------------------- |
| `offline`                     | browser has no connectivity    | no (query pauses; resumes on reconnect)  |
| `network`                     | request could not complete     | yes                                      |
| `timeout`                     | no response within the limit   | yes                                      |
| `http` 5xx (500/502/503/504)  | server failed                  | yes                                      |
| `http` 429                    | rate limited                   | yes, honoring `Retry-After` when present |
| `http` 4xx (others, e.g. 404) | request problem                | **no**                                   |
| `malformed`                   | response failed Zod validation | **no**                                   |
| `cancelled`                   | aborted by us                  | never surfaced as an error               |

- Never treat every HTTP error as "offline". The UI shows a distinct state per kind when the distinction matters to the user.
- Retry policy: max attempts, exponential backoff with jitter, stop conditions and UX impact are documented in one place and unit-tested.
- Responses from external APIs are **untrusted**: validate with Zod at the API-function layer, even if TypeScript says otherwise.

## Reliability Lab

- Scenarios (minimum): Normal, Slow response, Timeout, HTTP 404, HTTP 500, Network error, Malformed response, Random failure.
- MSW intercepts the **same** requests the app makes. There is no alternative "lab implementation" of the app.
- Scenarios are **deterministic and reproducible**: seeded randomness, and "fail N times then recover" style behavior where it demonstrates retry/recovery.
  The active scenario must be shareable (URL) so a behavior can be reproduced.
- The Lab shows: active scenario, expected behavior, observed behavior, request count/types, current app state, and recovery after the failure.
  It is an observation tool, not a bag of toggles.
- MSW is loaded lazily (dynamic import) so it is not part of the normal-mode bundle.
- Changing scenario must not hide behavior behind stale cache without saying so; the Lab offers explicit cache reset/refetch.

## Observability

Only what demonstrates a concept: request duration, status, retry count, error kind, failed requests, cache hit/miss when measurable, recovery events.
No observability platform. Telemetry is produced at the HTTP-client/QueryCache boundary, not inside components.

## Performance

- Treat performance as architecture (pagination, prefetching, deduplication, caching, image loading, Web Vitals).
- No `memo` / `useMemo` / `useCallback` / lazy-loading "out of habit". Each optimization must state: the problem, the trade-off, and **how to measure the impact**.

## Code quality

- `strict` TypeScript. No `any` without a justifying comment. Prefer `unknown` + narrowing/Zod.
- Small functions, single responsibility, low coupling, high cohesion.
- Business logic outside the UI (hooks/utils/api). Components render.
- Comments only for the non-obvious _why_. No comments that restate the code.
- Explicit loading / error / empty / success states for every data view.
- Accessibility is a requirement: semantic HTML, labels, keyboard support, `aria-live` for async status, visible focus, sufficient contrast.
- Avoid: giant components, hooks doing too much, duplicated code, overengineering.

## Design

Minimal, modern, product-like. Styling is Tailwind CSS v4. The palette lives **only** in `src/styles/tokens.css` (`@theme`) and is consumed through
utilities (`bg-surface`, `text-foreground`, `border-border`, `text-subtle`, ...). No arbitrary color values (`bg-[#fff]`) in components:

```text
Background #F8FAFC · Surface #FFFFFF · Primary #64748B · Primary Light #E2E8F0 · Text #334155
Muted Text #94A3B8 · Border #E2E8F0 · Success #86A88A · Warning #C9A66B · Error #C98282 · Info #7C9BB5
```

Status colors are never the only carrier of meaning (also icon/text). Note: Muted Text `#94A3B8` on white is below WCAG AA for body text —
use it (`text-muted`) only for large/secondary non-essential text, and `text-subtle` for readable secondary text.

## Testing

- Test **behavior**, not implementation. No tests written only for coverage.
- Vitest: unit tests (retry policy, error normalization, schemas, scenario engine).
- React Testing Library: components/pages against MSW (node server using the **same handlers** as the browser).
- Playwright: end-to-end reliability flows against the real MSW service worker.
- Priority flows: 500 → error state → retry available → retry succeeds → recovers without reload; slow → loading → timeout → handled;
  connection lost → offline state → reconnect → recovers; malformed response → not retried; 404 → not retried;
  cancellation, race conditions, request deduplication, stale data, cache behavior.
- Tests use small deterministic timings (inject timeouts/backoff); no real sleeping for seconds.

## Documentation

- `README.md`: purpose, architecture, stack, Reliability Lab, reliability patterns, how to run, how to test, key decisions.
- Relevant decisions get a short ADR in `docs/decisions/NNNN-title.md` with exactly these sections:
  `Problem · Solution · Why this approach · Alternatives · Trade-offs · How it is tested`.
- No ADRs for trivial decisions. Retry policy, error taxonomy, MSW strategy, offline handling, cache config, i18n approach are ADR-worthy.

## Scripts (source of truth for "done")

`npm run check` = typecheck + lint + format check + unit/component tests. It must pass before a step is considered finished.
`npm run test:e2e` runs Playwright.
