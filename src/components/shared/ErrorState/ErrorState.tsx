import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useI18n } from '@/i18n'
import { presentError } from './presentError'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useI18n()
  const { variant, badge, status, canRetry } = presentError(error)

  return (
    <Card role="alert" className="max-w-xl">
      <CardHeader>
        <Badge variant="outline" className="border-destructive">
          {t(`errors.badge.${badge}`, status !== undefined ? { status } : undefined)}
        </Badge>
        <h2 className="text-lg leading-tight font-semibold">{t(`errors.${variant}.title`)}</h2>
        <p className="text-muted-foreground text-sm">{t(`errors.${variant}.description`)}</p>
      </CardHeader>
      {canRetry && onRetry && (
        <CardContent>
          <Button onClick={onRetry}>{t('errors.retry')}</Button>
        </CardContent>
      )}
    </Card>
  )
}
