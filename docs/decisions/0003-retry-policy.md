# 0003 — Retry policy

## Problem

Retrying blindly is harmful: it multiplies load on a struggling server, delays the error the user needs to see, and can
never succeed for deterministic failures (a 404 or a body that fails validation). But not retrying at all turns every
transient blip into a user-visible error.

## Solution

`src/api/retryPolicy.ts`, wired into TanStack Query's `retry` / `retryDelay` in `src/api/queryClient.ts`:

- **Retried:** `network`, `timeout`, HTTP `500/502/503/504`, HTTP `429` when `Retry-After` is ≤ 10 s (or absent).
- **Never retried:** other 4xx (incl. 404), `malformed`, `offline`, `cancelled`, and non-`ApiError` errors.
- **Limit:** 2 retries (3 attempts in total).
- **Backoff:** exponential (500 ms base, doubling, capped at 8 s) with _equal jitter_: half of the ceiling is fixed, half random,
  so delays land in 250–500 ms, then 500–1000 ms. `Retry-After` overrides the computed delay.
- **Stops when:** the limit is reached, the error is not retryable, or the query is cancelled (unmount/navigation aborts the request).
- **Offline:** not retried. With `networkMode: 'online'` (kept on purpose) TanStack Query pauses queries while offline and
  refetches on reconnect, so there is nothing to poll.

**UX impact:** a transient failure usually resolves invisibly in about a second. A persistent failure surfaces after
3 attempts: ~1.5 s for fast failures such as 500, up to ~20 s for timeouts (3 × 6 s + backoff). The UI shows the loading
state during retries and then a manual "Try again".

## Why this approach

The policy is a pure function of `ApiError`, so it is trivial to test and to reason about; the taxonomy (ADR 0002) does the
classification work. Jitter avoids synchronized retry storms if many clients fail together; the fixed half guarantees a
minimum pause.

## Alternatives

- Library default (`retry: 3`, retry everything): retries 404s and validation failures.
- Full jitter: better spread, but can retry almost immediately.
- Retrying `offline`: would spin against a dead connection.
- Longer `Retry-After` obeyed as-is: a minute-long spinner is worse than an error with a retry button.

## Trade-offs

- Worst-case time to error for timeouts is long. Lowering `REQUEST_TIMEOUT_MS` or not retrying timeouts would shorten it at the
  cost of more visible failures on slow networks.
- Retries are per query attempt; there is no global retry budget across queries.

## How it is tested

- `src/api/retryPolicy.test.ts`: table tests for every error class, the limit, backoff bounds/cap, and `Retry-After`.
- `src/api/queryClient.test.ts`: against MSW: recovers from 500 → 503 → 200 with 3 requests; gives up after the limit;
  1 request only for 404 and for malformed; retries a network failure; also deduplication, fresh-cache reuse, and abort on cancel.
