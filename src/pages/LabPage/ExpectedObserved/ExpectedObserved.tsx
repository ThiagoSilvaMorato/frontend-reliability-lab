import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useI18n } from '@/i18n'
import type { ScenarioId } from '@/models/reliability'
import { useQueryStates } from '../hooks/useQueryStates'
import { useRequestLog, useRetryCount } from '../hooks/useRequestLog'
import { summarizeRequests } from '../utils/summarizeRequests'

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-lg font-semibold whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  )
}

export function ExpectedObserved({ scenario }: { scenario: ScenarioId }) {
  const { t } = useI18n()
  const summary = summarizeRequests(useRequestLog())
  const retries = useRetryCount()
  const online = useOnlineStatus()
  const queries = useQueryStates()

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="gap-3">
        <CardHeader>
          <h2 className="font-semibold">{t('lab.expected.title')}</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{t(`lab.scenarios.${scenario}.expected`)}</p>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <h2 className="font-semibold">{t('lab.observed.title')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-3 gap-3">
            <Metric label={t('lab.observed.requests')} value={summary.total} />
            <Metric label={t('lab.observed.succeeded')} value={summary.succeeded} />
            <Metric label={t('lab.observed.failed')} value={summary.failed} />
            <Metric label={t('lab.observed.retries')} value={retries} />
            <Metric label={t('lab.observed.cancelled')} value={summary.cancelled} />
            <Metric
              label={t('lab.observed.averageDuration')}
              value={summary.averageDurationMs === null ? '–' : `${summary.averageDurationMs} ms`}
            />
          </dl>

          {summary.total === 0 && (
            <p className="text-muted-foreground text-sm">{t('lab.observed.empty')}</p>
          )}
          {summary.recoveredAfter !== null && (
            <Alert variant="info" role="status">
              <AlertDescription>
                {t('lab.observed.recovered', { count: summary.recoveredAfter })}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium">{t('lab.observed.state.title')}</h3>
            <ul className="text-muted-foreground space-y-0.5 text-sm">
              <li>
                {t('lab.observed.state.connectivity')}:{' '}
                {online ? t('lab.observed.state.online') : t('lab.observed.state.offline')}
              </li>
              <li>
                {t('lab.observed.state.queries')}: {queries.fetching}{' '}
                {t('lab.observed.state.fetching')}, {queries.paused}{' '}
                {t('lab.observed.state.paused')}, {queries.errored}{' '}
                {t('lab.observed.state.errored')}, {queries.ready} {t('lab.observed.state.ready')}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
