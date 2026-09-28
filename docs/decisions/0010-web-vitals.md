# 0010 — Real-user Core Web Vitals

## Problem

ADR 0001 deliberately left `web-vitals` undecided ("for now"): performance work needs a way to measure
impact, not just a claim that something is faster. Without it, `CLAUDE.md`'s own rule — "every
optimization must state ... how its impact can be measured" — has no instrument to point to.

## Solution

`web-vitals` (Google's own library, the one Chrome and CrUX use) collects the five Core Web Vitals —
LCP, INP, CLS, FCP, TTFB — started once in `main.tsx` via `startWebVitals()`. Each reported metric is
pushed into `src/observability/webVitals.ts`, a store with the same `subscribe`/`getSnapshot` shape as
`requestLog` and `retryCounter`, and logged to the console (`[web-vitals] LCP: 200 (good)`) — the whole
"shipped to a backend" story here, since this project has no analytics vendor and none is being added
just to have somewhere to send this.

A `WebVitalsPanel` on the Lab page displays the five metrics with a good/needs-improvement/poor border
using the palette's status tokens. It is its **own card**, separate from "Observed behavior": Web
Vitals describe this page load's performance, not the active reliability scenario, and conflating the
two would blur what each is answering.

## Why this approach

The official library over hand-rolled `PerformanceObserver` calls: LCP and CLS in particular have
non-obvious calculation rules (largest element so far, session windows) that `web-vitals` gets right in
~2–3 kB; reimplementing them would be effort spent on something that is not this project's point.
Console logging plus a simple reactive display was chosen over wiring a real analytics endpoint,
because there is no backend to receive it and inventing one only to show a chart would be exactly the
kind of complexity `CLAUDE.md` says to avoid ("não construir uma plataforma de observabilidade
completa").

## Alternatives

- A charting/history view of vitals over time: more than "demonstrate the concept" calls for; a single
  current reading per metric is enough to show the capability.
- Sending metrics to a real vendor (Sentry, Datadog RUM, Vercel Analytics): would need an account and a
  backend concern this project doesn't otherwise have; the console + in-app panel already show the data
  is being collected correctly.
- Lazy-loading `web-vitals` itself: rejected — FCP and TTFB must be observed from the very start of the
  page's life to be meaningful, so it has to run before first render, not on demand like the Lab UI.

## Trade-offs

- Added to the main bundle unconditionally (not lazy, for the reason above): ~9.6 kB raw / ~3.4 kB gzip
  (measured via `vite build`), a deliberate, accepted cost for the Normal-mode path.
- CLS and INP are, by the library's own design, session-based and often do not finalize until the tab
  is hidden or closed — the panel can legitimately show "measuring…" for those two throughout a normal
  visit. This is documented in the code and is not a bug.
- Metrics are per browser tab, in memory only; nothing persists across a reload or is aggregated across
  visits (there is no backend to aggregate them in).

## How it is tested

`webVitals.test.ts`: the five collectors are registered exactly once, a reported metric updates the
store and notifies subscribers, and unsubscribing stops notifications (all with `web-vitals` mocked, so
these are unit tests of the store's own logic, not of the library). `WebVitalsPanel.test.tsx`: pending
state before anything is reported, a reported value renders with its unit and rating, CLS renders as a
unitless score rather than milliseconds, metrics update independently, and the panel renders in both
languages. Verified manually in a real browser: TTFB and FCP appear on first paint, and LCP correctly
updates to the Pokémon artwork's paint time after navigating to a detail page within the same session.
