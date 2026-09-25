import { Button } from '@/components/ui/button'
import { LOCALES, useI18n, type Locale } from '@/i18n'

const SHORT_LABEL: Record<Locale, string> = { en: 'EN', 'pt-BR': 'PT' }

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div role="group" aria-label={t('language.label')} className="flex gap-1">
      {LOCALES.map((option) => (
        <Button
          key={option}
          size="sm"
          variant={option === locale ? 'default' : 'ghost'}
          aria-pressed={option === locale}
          aria-label={t(`language.option.${option}`)}
          lang={option}
          onClick={() => setLocale(option)}
        >
          {SHORT_LABEL[option]}
        </Button>
      ))}
    </div>
  )
}
