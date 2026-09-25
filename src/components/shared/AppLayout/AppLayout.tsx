import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation } from 'react-router'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary/ErrorBoundary'
import { ErrorState } from '@/components/shared/ErrorState/ErrorState'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher/LanguageSwitcher'
import { OfflineBanner } from '@/components/shared/OfflineBanner/OfflineBanner'
import { useI18n } from '@/i18n'
import { cn } from 'cn'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-accent',
  )
}

export function AppLayout() {
  const { t } = useI18n()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="bg-card sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('nav.skipToContent')}
      </a>
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="font-semibold">{t('app.name')}</span>
          <nav aria-label={t('nav.label')} className="flex gap-1">
            <NavLink to="/" end className={navLinkClass}>
              {t('nav.pokedex')}
            </NavLink>
            <NavLink to="/lab" className={navLinkClass}>
              {t('nav.lab')}
            </NavLink>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>
      <OfflineBanner />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              resetKeys={[pathname]}
              fallback={({ error, reset: retry }) => <ErrorState error={error} onRetry={retry} />}
            >
              <Outlet />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </main>
    </div>
  )
}
