import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { useScenario } from '@/hooks/useScenario'
import { useI18n } from '@/i18n'

/** Tells the user, on every page, that requests are being simulated and where to look at it. */
export function ScenarioIndicator() {
  const { id } = useScenario()
  const { t } = useI18n()

  if (id === 'normal') return null

  return (
    <Link to={{ pathname: '/lab' }} className="rounded-full">
      <Badge variant="outline" className="border-warning">
        {t('lab.indicator', { name: t(`lab.scenarios.${id}.name`) })}
      </Badge>
    </Link>
  )
}
