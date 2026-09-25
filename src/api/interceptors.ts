import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '@/models/api'
import type { RequestOutcome } from '@/models/observability'
import { requestLog } from '@/observability/requestLog'
import { normalizeAxiosError } from './errors'

interface RequestMetadata {
  entryId: number
  startedAt: number
}

// Keyed by the request config object, which Axios hands back on both responses and errors.
const metadata = new WeakMap<object, RequestMetadata>()

export function getRequestEntryId(config: object): number | undefined {
  return metadata.get(config)?.entryId
}

export function attachInterceptors(client: AxiosInstance): void {
  function log(config: InternalAxiosRequestConfig, outcome: RequestOutcome, status?: number) {
    const meta = metadata.get(config)
    if (!meta) return
    const durationMs = Math.round(performance.now() - meta.startedAt)
    requestLog.record({
      id: meta.entryId,
      method: (config.method ?? 'get').toUpperCase(),
      url: client.getUri(config),
      startedAt: Date.now() - durationMs,
      durationMs,
      outcome,
      ...(status !== undefined && { status }),
    })
  }

  client.interceptors.request.use((config) => {
    metadata.set(config, { entryId: requestLog.nextId(), startedAt: performance.now() })
    return config
  })

  client.interceptors.response.use(
    (response) => {
      log(response.config, 'success', response.status)
      return response
    },
    (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        throw error instanceof Error ? error : new Error(String(error))
      }
      const apiError: ApiError = normalizeAxiosError(error)
      if (error.config) {
        log(error.config, apiError.info.kind, error.response?.status)
      }
      throw apiError
    },
  )
}
