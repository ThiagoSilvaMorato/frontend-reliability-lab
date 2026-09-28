# Frontend Reliability Lab

A Pokédex is the domain. A **Reliability Lab** is the product.

This is a personal project built to demonstrate frontend engineering under adverse conditions: how a
React application handles timeouts, server errors, malformed responses, flaky connections and lost
network — not just how it renders a list of Pokémon. The Pokédex (backed by the real
[PokéAPI](https://pokeapi.co)) exists to give the reliability work something real to fail on.

## What this project demonstrates

- Explicit **error taxonomy**: offline, network failure, timeout, HTTP 4xx/5xx and malformed responses
  are different situations, each with its own UI and its own retry decision.
- A **retry policy** treated as a reliability decision, not a library default — documented, unit-tested,
  and never applied to errors it cannot fix (a 404, a bad response body).
- Server state owned entirely by **TanStack Query**: caching, deduplication, cancellation, background
  refetch and stale-data handling, with no parallel `useState` bookkeeping.
- A **Reliability Lab** where failure scenarios are selected explicitly, run through the same code path
  as production, and are reproducible via a shareable URL.
- Runtime **response validation** with Zod, because TypeScript types say nothing about what a real
  server actually sent.
- Measured, justified **performance work** (route-level code splitting, real-user Web Vitals) instead of
  reflexive `memo`/`useMemo`.
- A test pyramid that matches what each layer can actually prove: Vitest for logic, React Testing
  Library against MSW for component behavior, Playwright for what only a real browser can show (a real
  network going offline, a real registered service worker).

Every non-trivial decision behind these is written down in [`docs/decisions/`](docs/decisions/) — see
[Engineering decisions](#engineering-decisions) below.

## The Reliability Lab

Pick a scenario, and it applies to **every request the app makes**, on every page — not a special demo
route with its own fake implementation. The same [MSW](https://mswjs.io) handlers that run in tests
intercept the same requests in the browser; only where a "healthy" response comes from differs (see
[ADR 0007](docs/decisions/0007-reliability-lab-msw.md)).

| Scenario                 | What it does                            | What the app does about it                                                 |
| ------------------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| **Normal**               | Talks to the real PokéAPI, untouched    | —                                                                          |
| **Slow response**        | Every request takes ~3s                 | Shows loading, then succeeds — no retry, it isn't broken, just slow        |
| **Timeout**              | Requests never get an answer            | 3 attempts (6s each) with backoff, then a timeout error with manual retry  |
| **HTTP 404**             | Every request answers "not found"       | Fails once, no retry, no retry button — a 404 won't fix itself             |
| **HTTP 500**             | Every request fails with a server error | Retries twice, then an error with **Try again**; recovers without a reload |
| **Network error**        | The connection drops before any answer  | Retried like a 500, but reported as a connection problem, not a server one |
| **Malformed response**   | HTTP 200 with data in the wrong shape   | Rejected by Zod validation, never retried (the same body would fail again) |
| **Random failure**       | ~50% of requests fail in different ways | Most failures are absorbed by retries; seeded, so a run is reproducible    |
| **Flaky, then recovers** | Each URL fails twice, then works        | The retry policy hides it entirely — only the log shows it happened        |
| **Offline (simulated)**  | Behaves as if the connection was lost   | Queries pause (not fail); resume automatically when the scenario ends      |

For each scenario the Lab shows **expected vs. observed** behavior side by side, live counts (requests,
successes, failures, automatic retries, cancellations), a request log, current query/connectivity state,
and real-user [Web Vitals](docs/decisions/0010-web-vitals.md) for the page. The active scenario (and its
seed, for Random) lives in the URL — `/lab?scenario=http500` reproduces the same run for anyone who
opens that link, including loading it correctly on the very first request.

## Reliability patterns

**Error taxonomy** ([ADR 0002](docs/decisions/0002-error-taxonomy.md)) — every failure is normalized once,
at the HTTP client boundary, into a single discriminated union:

| kind             | meaning                        | retried automatically?                     |
| ---------------- | ------------------------------ | ------------------------------------------ |
| `offline`        | browser has no connectivity    | no — query pauses and resumes on reconnect |
| `network`        | request could not complete     | yes                                        |
| `timeout`        | no response within 6s          | yes                                        |
| `http` 5xx / 429 | server failed / rate-limited   | yes (429 honors `Retry-After`)             |
| `http` other 4xx | request problem (e.g. 404)     | no                                         |
| `malformed`      | response failed Zod validation | no                                         |
| `cancelled`      | aborted by the app itself      | never shown as an error                    |

**Retry policy** ([ADR 0003](docs/decisions/0003-retry-policy.md)) — up to 2 retries (3 attempts total),
exponential backoff with equal jitter (500ms base, capped at 8s), applied only to the retryable kinds
above. A persistent failure surfaces in ~1.5s for a 500, up to ~20s for a timeout.

**Offline vs. API failure** — the app never treats an HTTP error as "offline". Real connectivity loss
(`context.setOffline` in [E2E tests](docs/decisions/0008-e2e-strategy.md), or the browser's own
`online`/`offline` events in production) pauses queries via TanStack Query's `onlineManager`; they
resume automatically, with no error ever shown.

## Architecture

```text
Component → Hook → API function → Zod validation → Axios client → PokéAPI (or the Lab's MSW worker)
```

Components never import Axios, never know a PokéAPI URL, and never know whether a response came from the
real API or from MSW.

```text
src/
├── components/
│   ├── ui/          # shadcn/ui primitives (Button, Card, Alert, Table, ...)
│   └── shared/      # AppLayout, ErrorBoundary, ErrorState, QueryView, OfflineBanner, ...
├── api/
│   ├── index.ts         # Axios client: baseURL, timeout, interceptors
│   ├── errors.ts         # AxiosError → ApiError normalization
│   ├── retryPolicy.ts    # what retries, how many times, what backoff
│   ├── queryClient.ts    # TanStack Query defaults
│   └── shared/           # Pokémon API functions + queryOptions factory
├── models/          # shared types AND Zod schemas (types are inferred from schemas)
├── pages/           # route-level components; page-specific hooks/utils live beside the page
├── routes/          # router definition (the Lab route is code-split)
├── i18n/            # en.json, pt-BR.json — keys typed from en.json
├── mocks/           # MSW handlers, the scenario engine, browser worker, node server
├── observability/   # request log, retry counter, Web Vitals — all one useSyncExternalStore each
├── hooks/ · utils/  # only what is used by 2+ places
└── styles/          # design tokens (@theme) and global.css
```

`CLAUDE.md` carries the full set of working rules this codebase was built against (architecture, reuse,
file size, TanStack Query usage, testing, documentation) — it is the actual source of truth used while
building this, not a summary written after the fact.

## Stack

React 19 · TypeScript (strict) · Vite · TanStack Query · Axios · Zod · React Router · MSW · Tailwind CSS
v4 · shadcn/ui (Radix) · Vitest · React Testing Library · Playwright · web-vitals · ESLint · Prettier.

Every dependency here was chosen against a stated alternative and a stated cost — see
[ADR 0001](docs/decisions/0001-stack-and-architecture-review.md) for the full reasoning, including what
was deliberately **not** added (Redux/Zustand, a UI kit beyond shadcn, an analytics vendor) and why.

## Getting started

Requires Node.js ≥ 20.

```bash
npm install
npm run dev          # http://localhost:5173 — talks to the real PokéAPI
```

```bash
npm run build         # typecheck + production build
npm run preview        # serve the production build locally
```

No environment variables or API keys are needed — PokéAPI is public and unauthenticated.

## Testing

```bash
npm run check          # typecheck + lint + format check + unit/component tests — the "is this done" gate
npm run test:watch     # Vitest in watch mode
npm run test:e2e       # Playwright, against a real production build
npm run test:e2e:ui    # Playwright's UI mode
```

- **Vitest** — pure logic: the retry policy, error normalization, Zod schemas against real captured
  PokéAPI responses, the scenario engine (including pinned seeded-random sequences).
- **React Testing Library**, against an MSW node server using the exact same handlers as the browser —
  component and page behavior: every reliability scenario, request deduplication, cache reuse, race
  conditions (a superseded pagination request gets aborted), i18n, accessibility.
- **Playwright**, against a real Chromium browser and a real production build — the two things RTL's
  jsdom cannot prove: a real network actually going offline (`context.setOffline`) and the real MSW
  service worker registering and intercepting exactly as it will for a user. See
  [ADR 0008](docs/decisions/0008-e2e-strategy.md) for exactly what each layer is responsible for and why.

## Engineering decisions

Short ADRs (`Problem · Solution · Why this approach · Alternatives · Trade-offs · How it is tested`) for
every decision worth explaining to another engineer reading this later:

| ADR                                                          | Decision                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [0001](docs/decisions/0001-stack-and-architecture-review.md) | Stack and architecture review                                                  |
| [0002](docs/decisions/0002-error-taxonomy.md)                | Error taxonomy at the HTTP boundary                                            |
| [0003](docs/decisions/0003-retry-policy.md)                  | Retry policy                                                                   |
| [0004](docs/decisions/0004-shadcn-ui-components.md)          | shadcn/ui for UI primitives                                                    |
| [0005](docs/decisions/0005-i18n.md)                          | In-house typed i18n                                                            |
| [0006](docs/decisions/0006-pokedex-data-strategy.md)         | Pokédex data strategy: pagination, search, prefetch, cache                     |
| [0007](docs/decisions/0007-reliability-lab-msw.md)           | Reliability Lab: one MSW handler set, a pure scenario engine, loaded on demand |
| [0008](docs/decisions/0008-e2e-strategy.md)                  | E2E strategy: what needs a real browser                                        |
| [0009](docs/decisions/0009-lab-route-code-splitting.md)      | Code-splitting the Reliability Lab route                                       |
| [0010](docs/decisions/0010-web-vitals.md)                    | Real-user Core Web Vitals                                                      |

## License

Personal portfolio project. No license file yet — ask before reusing.
