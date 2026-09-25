import { useI18n } from '@/i18n'

export function LabPage() {
  const { t } = useI18n()

  return (
    <>
      <title>{`${t('pages.lab.title')} · ${t('app.name')}`}</title>
      <h1 className="text-2xl font-semibold">{t('pages.lab.title')}</h1>
      <p className="text-muted-foreground mt-2">{t('pages.lab.description')}</p>
    </>
  )
}
