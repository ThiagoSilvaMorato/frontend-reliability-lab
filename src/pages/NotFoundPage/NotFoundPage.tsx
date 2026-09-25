import { Link } from 'react-router'
import { useI18n } from '@/i18n'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <>
      <title>{`${t('pages.notFound.title')} · ${t('app.name')}`}</title>
      <h1 className="text-2xl font-semibold">{t('pages.notFound.title')}</h1>
      <p className="text-muted-foreground mt-2">{t('pages.notFound.description')}</p>
      <Link to="/" className="mt-4 inline-block underline underline-offset-4">
        {t('pages.notFound.back')}
      </Link>
    </>
  )
}
