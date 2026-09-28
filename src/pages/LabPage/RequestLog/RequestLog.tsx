import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/i18n'
import type { RequestOutcome } from '@/models/observability'
import { requestLog } from '@/observability/requestLog'
import { useRequestLog } from '../hooks/useRequestLog'

const MAX_ROWS = 50

// Color never carries the meaning alone: the result column always has text.
const OUTCOME_BORDER: Record<RequestOutcome, string> = {
  success: 'border-success',
  http: 'border-destructive',
  network: 'border-destructive',
  timeout: 'border-destructive',
  offline: 'border-warning',
  malformed: 'border-destructive',
  cancelled: 'border-warning',
}

function shortUrl(url: string) {
  const { pathname, search } = new URL(url)
  return `${pathname.replace(/^\/api\/v2/, '')}${search}`
}

export function RequestLog() {
  const { t, locale } = useI18n()
  const entries = useRequestLog()
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'medium' })
  const rows = entries.slice(-MAX_ROWS).reverse()

  return (
    <section aria-labelledby="request-log-title">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="request-log-title" className="text-lg font-semibold">
          {t('lab.log.title')}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={requestLog.clear}
          disabled={entries.length === 0}
        >
          {t('lab.log.clear')}
        </Button>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableCaption className="sr-only">{t('lab.log.caption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('lab.log.time')}</TableHead>
              <TableHead>{t('lab.log.request')}</TableHead>
              <TableHead>{t('lab.log.status')}</TableHead>
              <TableHead>{t('lab.log.result')}</TableHead>
              <TableHead className="text-right">{t('lab.log.duration')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  {t('lab.log.empty')}
                </TableCell>
              </TableRow>
            )}
            {rows.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="tabular-nums">{time.format(entry.startedAt)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {entry.method} {shortUrl(entry.url)}
                </TableCell>
                <TableCell className="tabular-nums">{entry.status ?? '–'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={OUTCOME_BORDER[entry.outcome]}>
                    {t(`lab.log.outcome.${entry.outcome}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{entry.durationMs} ms</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
