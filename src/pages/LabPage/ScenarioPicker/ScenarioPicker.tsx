import { useI18n } from '@/i18n'
import { SCENARIO_IDS, type ScenarioId } from '@/models/reliability'

interface ScenarioPickerProps {
  value: ScenarioId
  onChange: (id: ScenarioId) => void
}

export function ScenarioPicker({ value, onChange }: ScenarioPickerProps) {
  const { t } = useI18n()

  return (
    <fieldset aria-describedby="scenario-hint">
      <legend className="mb-1 text-lg font-semibold">{t('lab.scenario.legend')}</legend>
      <p id="scenario-hint" className="text-muted-foreground mb-3 text-sm">
        {t('lab.scenario.hint')}
      </p>
      <div className="grid gap-2">
        {SCENARIO_IDS.map((id) => (
          <label key={id} className="relative block cursor-pointer">
            <input
              type="radio"
              name="scenario"
              value={id}
              checked={id === value}
              onChange={() => onChange(id)}
              // Transparent but covering the whole card: real clicks land on the input, keyboard and screen readers keep it.
              className="peer absolute inset-0 size-full cursor-pointer opacity-0"
            />
            <span className="bg-card peer-checked:border-primary peer-checked:bg-secondary peer-focus-visible:ring-ring/50 block rounded-lg border p-3 text-sm peer-focus-visible:ring-[3px]">
              <span className="block font-medium">{t(`lab.scenarios.${id}.name`)}</span>
              <span className="text-muted-foreground block">
                {t(`lab.scenarios.${id}.description`)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
