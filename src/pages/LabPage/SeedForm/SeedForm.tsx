import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'

interface SeedFormProps {
  seed: number
  onApply: (seed: number) => void
}

/** Submitting the same seed again restarts the sequence, which is how a run is replayed. */
export function SeedForm({ seed, onApply }: SeedFormProps) {
  const { t } = useI18n()

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        const value = Number(new FormData(event.currentTarget).get('seed'))
        if (Number.isInteger(value) && value >= 0) onApply(value)
      }}
    >
      <label htmlFor="scenario-seed" className="block text-sm font-medium">
        {t('lab.seed.label')}
      </label>
      <div className="flex gap-2">
        <Input
          key={seed}
          id="scenario-seed"
          name="seed"
          type="number"
          min={0}
          step={1}
          defaultValue={seed}
          aria-describedby="seed-help"
          className="max-w-28"
        />
        <Button type="submit" variant="outline">
          {t('lab.seed.apply')}
        </Button>
      </div>
      <p id="seed-help" className="text-muted-foreground text-xs">
        {t('lab.seed.help')}
      </p>
    </form>
  )
}
