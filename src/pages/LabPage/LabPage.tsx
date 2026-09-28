import { Alert, AlertDescription } from '@/components/ui/alert'
import { useI18n } from '@/i18n'
import { CacheControls } from './CacheControls/CacheControls'
import { ExpectedObserved } from './ExpectedObserved/ExpectedObserved'
import { useScenarioControls } from './hooks/useScenarioControls'
import { LiveProbe } from './LiveProbe/LiveProbe'
import { RequestLog } from './RequestLog/RequestLog'
import { ScenarioPicker } from './ScenarioPicker/ScenarioPicker'
import { WebVitalsPanel } from './WebVitalsPanel/WebVitalsPanel'
import { SeedForm } from './SeedForm/SeedForm'

export function LabPage() {
  const { t } = useI18n()
  const controls = useScenarioControls()
  const { scenario, status } = controls

  return (
    <>
      <title>{`${t('pages.lab.title')} · ${t('app.name')}`}</title>
      <h1 className="text-2xl font-semibold">{t('pages.lab.title')}</h1>
      <p className="text-muted-foreground mt-2">{t('pages.lab.description')}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <ScenarioPicker value={scenario.id} onChange={(id) => void controls.select(id)} />
          {status === 'applying' && (
            <p role="status" className="text-muted-foreground text-sm">
              {t('lab.scenario.applying')}
            </p>
          )}
          {status === 'failed' && (
            <Alert variant="destructive">
              <AlertDescription>{t('lab.scenario.error')}</AlertDescription>
            </Alert>
          )}
          {scenario.id === 'random' && (
            <SeedForm
              seed={scenario.seed}
              onApply={(seed) => void controls.select('random', seed)}
            />
          )}
          <CacheControls
            resetOnChange={controls.resetOnChange}
            onResetOnChangeChange={controls.setResetOnChange}
            onReset={controls.resetCache}
            onRefetch={controls.refetch}
          />
        </div>

        <div className="space-y-6">
          <ExpectedObserved scenario={scenario.id} />
          <WebVitalsPanel />
          <LiveProbe />
          <RequestLog />
        </div>
      </div>
    </>
  )
}
