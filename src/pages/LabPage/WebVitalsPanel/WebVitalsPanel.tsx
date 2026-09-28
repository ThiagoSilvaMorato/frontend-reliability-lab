import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { WebVitalName, WebVitalRating } from '@/observability/webVitals'
import { useI18n } from '@/i18n'
import { useWebVitals } from '../hooks/useWebVitals'

// CLS is a unitless score; the other four are durations in milliseconds.
const UNIT: Record<WebVitalName, string> = {
  CLS: '',
  INP: ' ms',
  LCP: ' ms',
  FCP: ' ms',
  TTFB: ' ms',
}

const METRICS: WebVitalName[] = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB']

const RATING_BORDER: Record<WebVitalRating, string> = {
  good: 'border-success',
  'needs-improvement': 'border-warning',
  poor: 'border-destructive',
}

function formatValue(name: WebVitalName, value: number) {
  const rounded = name === 'CLS' ? value.toFixed(2) : Math.round(value)
  return `${rounded}${UNIT[name]}`
}

/**
 * Real-user Core Web Vitals for this page load, not a per-scenario reliability metric, so it is its
 * own card rather than part of "Observed behavior": a slow LCP is a performance concern, not a sign
 * the network is failing. CLS and INP finalize late (tab hidden/closed) and may show "measuring…"
 * for a while — that is how the library is designed to work, not a bug.
 */
export function WebVitalsPanel() {
  const { t } = useI18n()
  const vitals = useWebVitals()

  return (
    <Card className="gap-3">
      <CardHeader>
        <h2 className="font-semibold">{t('lab.vitals.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('lab.vitals.description')}</p>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {METRICS.map((name) => {
            const entry = vitals[name]
            return (
              <div
                key={name}
                className={`rounded-md border p-2 ${entry ? RATING_BORDER[entry.rating] : 'border-border'}`}
              >
                <dt className="text-muted-foreground text-xs">{t(`lab.vitals.metric.${name}`)}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {entry ? formatValue(name, entry.value) : '–'}
                </dd>
                <dd className="text-muted-foreground text-xs">
                  {entry ? t(`lab.vitals.rating.${entry.rating}`) : t('lab.vitals.pending')}
                </dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}
