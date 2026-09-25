import type { AxiosResponse } from 'axios'
import type { z } from 'zod'
import { getRequestEntryId } from '@/api/interceptors'
import { ApiError } from '@/models/api'
import { requestLog } from '@/observability/requestLog'

/**
 * Response bodies are untrusted: TypeScript types say nothing about what a server actually sent.
 * A body that fails the schema becomes a `malformed` ApiError (never retried) and the request-log
 * entry, which the HTTP layer recorded as a success, is corrected so observability matches reality.
 */
export function parseResponse<S extends z.ZodType>(
  schema: S,
  response: AxiosResponse,
): z.output<S> {
  const result = schema.safeParse(response.data)
  if (result.success) return result.data

  const entryId = getRequestEntryId(response.config)
  if (entryId !== undefined) requestLog.update(entryId, { outcome: 'malformed' })

  throw new ApiError({
    kind: 'malformed',
    issues: result.error.issues.map(
      (issue) => `${issue.path.map(String).join('.')}: ${issue.message}`,
    ),
  })
}
