import type { ApiErrorKind } from './api'

export type RequestOutcome = 'success' | ApiErrorKind

export interface RequestLogEntry {
  id: number
  method: string
  url: string
  /** Epoch ms. */
  startedAt: number
  durationMs: number
  /** Absent when no HTTP response was received (network, timeout, offline, cancelled). */
  status?: number
  outcome: RequestOutcome
}
