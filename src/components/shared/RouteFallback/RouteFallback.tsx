import { useI18n } from '@/i18n'

/**
 * Suspense fallback for a lazy-loaded route (see routes/index.tsx). Same convention as QueryView's
 * loading state: a `status` role announces the wait, its text stays screen-reader-only since a route
 * transition is a visible enough signal on its own.
 */
export function RouteFallback() {
  const { t } = useI18n()

  return (
    <div role="status" aria-live="polite" className="py-12">
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
