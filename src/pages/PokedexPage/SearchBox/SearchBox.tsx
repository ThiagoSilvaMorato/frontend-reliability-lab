import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const { t } = useI18n()

  return (
    <div className="max-w-sm">
      <label htmlFor="pokemon-search" className="mb-1 block text-sm font-medium">
        {t('pokedex.search.label')}
      </label>
      <Input
        id="pokemon-search"
        type="search"
        value={value}
        placeholder={t('pokedex.search.placeholder')}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
