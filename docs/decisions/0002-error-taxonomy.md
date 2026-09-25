# 0002 — Error taxonomy at the HTTP boundary

## Problem

"The request failed" hides very different situations that need different UI and different recovery: no connectivity, a
dropped connection, a slow server, a server error, a bad request, or a body that is not what we expected. Treating all of
them as "offline" (or all as "error") gives wrong messages and wrong retry behavior. Axios errors also leak transport
details (`error.code`, `error.response`) into whoever catches them.

## Solution

One place, `normalizeAxiosError` (`src/api/errors.ts`), converts everything into a single `ApiError` whose `info` is a
discriminated union (`src/models/api.ts`):

| kind        | detected by                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| `cancelled` | `ERR_CANCELED` (our `AbortSignal`)                                           |
| `http`      | a response arrived; carries `status` and parsed `Retry-After`                |
| `timeout`   | no response, code `ETIMEDOUT`/`ECONNABORTED`                                 |
| `offline`   | no response, not a timeout, and `navigator.onLine === false`                 |
| `network`   | no response, not a timeout, and `navigator.onLine === true`                  |
| `malformed` | HTTP 200 but the body fails the Zod schema (`parseResponse` in `api/shared`) |

`httpClient` rejects **only** with `ApiError`. Non-Axios errors (bugs) are re-thrown untouched, never disguised as network
failures. `malformed` is raised one layer up, in the API function, because only it knows the expected schema; it also
corrects the request-log entry from "success" to "malformed" so observability matches what the app experienced.

The client uses Axios' `fetch` adapter so the timeout is enforced by Axios itself.

## Why this approach

- The decision is made once, at the boundary; components and hooks only switch on `error.info.kind`.
- `navigator.onLine` is unreliable when it says _online_ (captive portals, dead Wi-Fi) but reliable when it says _offline_.
  It is therefore only used to refine an already-failed request, never to pre-empt one.
- `timeout` vs `network` matters to users ("server is slow" vs "connection problem") and to retry policy.

## Alternatives

- Expose `AxiosError` and inspect it in hooks: leaks the HTTP client into the UI and duplicates the mapping.
- Subclass per kind (`TimeoutError`, ...): more ceremony, and a discriminated union gives exhaustive `switch` checking for free.
- Default XHR adapter: MSW's simulated XHR ignores `timeout` (jsdom tests, unit level), so the timeout path could not be tested
  in the same way it runs in the browser. The fetch adapter removes that difference.

## Trade-offs

- `offline` can be wrong in the other direction (reported online while actually disconnected → shows as `network`, which is
  still retried and still accurate about what happened: the request failed to complete).
- `malformed` sits outside the HTTP client, so every API function must call `parseResponse`. Convention plus review, not enforcement.

## How it is tested

`src/api/index.test.ts` drives the real client against MSW for 404, 500, 429 + `Retry-After`, connection error (online and
offline), never-arriving response (timeout), and abort. `src/api/shared/pokemon.test.ts` covers wrong shape, wrong types,
non-JSON body and the request-log correction.
