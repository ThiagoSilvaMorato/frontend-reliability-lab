export type ApiErrorInfo =
  | { kind: 'offline' }
  | { kind: 'network' }
  | { kind: 'timeout' }
  | { kind: 'http'; status: number; retryAfterMs?: number }
  | { kind: 'malformed'; issues: string[] }
  | { kind: 'cancelled' }

export type ApiErrorKind = ApiErrorInfo['kind']

/** The only error type that leaves the API layer. Narrow on `error.info.kind`. */
export class ApiError extends Error {
  readonly info: ApiErrorInfo

  constructor(info: ApiErrorInfo, options?: ErrorOptions) {
    super(info.kind === 'http' ? `http ${info.status}` : info.kind, options)
    this.name = 'ApiError'
    this.info = info
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
