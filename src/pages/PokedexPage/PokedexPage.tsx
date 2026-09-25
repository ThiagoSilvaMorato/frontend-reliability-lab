import { useI18n } from '@/i18n'

export function PokedexPage() {
  const { t } = useI18n()

  return (
    <>
      <title>{`${t('pages.pokedex.title')} · ${t('app.name')}`}</title>
      <h1 className="text-2xl font-semibold">{t('pages.pokedex.title')}</h1>
      <p className="text-muted-foreground mt-2">{t('pages.pokedex.description')}</p>
    </>
  )
}
