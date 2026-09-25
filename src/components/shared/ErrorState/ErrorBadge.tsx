import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n'
import { presentError } from './presentError'

/** Short technical label of what went wrong: "HTTP 503", "Timeout", "Offline", ... */
export function ErrorBadge({ error }: { error: unknown }) {
  const { t } = useI18n()
  const { badge, status } = presentError(error)

  return (
    <Badge variant="outline" className="border-destructive">
      {t(`errors.badge.${badge}`, status !== undefined ? { status } : undefined)}
    </Badge>
  )
}
