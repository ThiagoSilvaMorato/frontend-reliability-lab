import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorBadge } from '@/components/shared/ErrorState/ErrorBadge'
import { ErrorState } from '@/components/shared/ErrorState/ErrorState'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

interface QueryViewProps<T> {
  query: UseQueryResult<T>
  /** Skeleton shown while the first response is pending. */
  loading: ReactNode
  children: (data: T) => ReactNode
}

/**
 * Renders every state of a query, so pages never repeat (or forget) one:
 *  - data + failed background refresh → keep showing the data, say it may be stale, offer a retry
 *  - no data + offline               → "waiting for a connection" (the query is paused, not failed)
 *  - no data + error                 → ErrorState specific to the kind of failure
 *  - no data + pending               → the skeleton
 */
export function QueryView<T>({ query, loading, children }: QueryViewProps<T>) {
  const { t } = useI18n()

  if (query.data !== undefined) {
    return (
      <>
        {query.isRefetchError && (
          <Alert variant="warning" role="status" className="mb-4">
            <AlertTitle className="flex flex-wrap items-center gap-2">
              {t('stale.title')}
              <ErrorBadge error={query.error} />
            </AlertTitle>
            <AlertDescription>
              <p>{t('stale.description')}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => void query.refetch()}
              >
                {t('errors.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {children(query.data)}
      </>
    )
  }

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }

  if (query.fetchStatus === 'paused') {
    return (
      <Alert variant="info" role="status">
        <AlertTitle>{t('offline.waiting.title')}</AlertTitle>
        <AlertDescription>{t('offline.waiting.description')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      {loading}
    </div>
  )
}
