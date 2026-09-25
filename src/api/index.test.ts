import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { POKEAPI_BASE_URL } from '@/api/config'
import { isApiError } from '@/models/api'
import { server } from '@/mocks/server'
import { requestLog } from '@/observability/requestLog'
import { httpClient } from '.'

const url = `${POKEAPI_BASE_URL}/pokemon/1`

async function failureOf(request: Promise<unknown>) {
  const error = await request.then(
    () => undefined,
    (e: unknown) => e,
  )
  if (!isApiError(error)) throw new Error(`expected an ApiError, got ${String(error)}`)
  return error
}

describe('httpClient error normalization', () => {
  it('maps an HTTP 404 to an http error with the status', async () => {
    server.use(http.get(url, () => HttpResponse.text('Not Found', { status: 404 })))
    expect((await failureOf(httpClient.get('/pokemon/1'))).info).toEqual({
      kind: 'http',
      status: 404,
    })
  })

  it('maps an HTTP 500 to an http error, not to network or offline', async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 500 })))
    expect((await failureOf(httpClient.get('/pokemon/1'))).info).toEqual({
      kind: 'http',
      status: 500,
    })
  })

  it('keeps Retry-After from a 429 so the retry policy can honor it', async () => {
    server.use(
      http.get(url, () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '2' } })),
    )
    expect((await failureOf(httpClient.get('/pokemon/1'))).info).toEqual({
      kind: 'http',
      status: 429,
      retryAfterMs: 2_000,
    })
  })

  it('maps a connection failure to network when the browser reports being online', async () => {
    server.use(http.get(url, () => HttpResponse.error()))
    expect((await failureOf(httpClient.get('/pokemon/1'))).info.kind).toBe('network')
  })

  it('maps a connection failure to offline when the browser reports being offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    server.use(http.get(url, () => HttpResponse.error()))
    expect((await failureOf(httpClient.get('/pokemon/1'))).info.kind).toBe('offline')
  })

  it('maps a response that never arrives to timeout', async () => {
    server.use(http.get(url, () => delay('infinite')))
    expect((await failureOf(httpClient.get('/pokemon/1', { timeout: 50 }))).info.kind).toBe(
      'timeout',
    )
  })

  it('maps an aborted request to cancelled', async () => {
    server.use(http.get(url, () => delay('infinite')))
    const controller = new AbortController()
    const request = failureOf(httpClient.get('/pokemon/1', { signal: controller.signal }))
    controller.abort()
    expect((await request).info.kind).toBe('cancelled')
  })
})

describe('httpClient telemetry', () => {
  it('logs successful requests with status and duration', async () => {
    await httpClient.get('/pokemon/1')
    const [entry] = requestLog.getSnapshot()
    expect(entry).toMatchObject({ method: 'GET', url, status: 200, outcome: 'success' })
    expect(entry?.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('logs failed requests with the error kind', async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 503 })))
    await failureOf(httpClient.get('/pokemon/1'))
    expect(requestLog.getSnapshot()).toMatchObject([{ status: 503, outcome: 'http' }])
  })
})
