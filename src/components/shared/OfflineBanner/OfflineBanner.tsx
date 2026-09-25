import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useI18n } from '@/i18n'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const { t } = useI18n()

  if (online) return null

  return (
    <Alert variant="info" role="status" className="rounded-none border-x-0">
      <AlertDescription className="mx-auto w-full max-w-5xl">
        {t('offline.banner')}
      </AlertDescription>
    </Alert>
  )
}
