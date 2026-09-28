import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

interface CacheControlsProps {
  resetOnChange: boolean
  onResetOnChangeChange: (value: boolean) => void
  onReset: () => void
  onRefetch: () => void
}

export function CacheControls(props: CacheControlsProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <input
          id="reset-on-change"
          type="checkbox"
          checked={props.resetOnChange}
          onChange={(event) => props.onResetOnChangeChange(event.target.checked)}
          aria-describedby="reset-hint"
          className="mt-1 size-4"
        />
        <div>
          <label htmlFor="reset-on-change" className="text-sm font-medium">
            {t('lab.cache.resetOnChange')}
          </label>
          <p id="reset-hint" className="text-muted-foreground text-xs">
            {t('lab.cache.hint')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={props.onReset}>
          {t('lab.cache.reset')}
        </Button>
        <Button variant="outline" size="sm" onClick={props.onRefetch}>
          {t('lab.cache.refetch')}
        </Button>
      </div>
    </div>
  )
}
