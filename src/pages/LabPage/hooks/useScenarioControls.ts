import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useScenario } from '@/hooks/useScenario'
import { applyScenario } from '@/mocks/lab'
import { toLabParams } from '@/mocks/scenarios/params'
import type { ScenarioId } from '@/models/reliability'

type Status = 'idle' | 'applying' | 'failed'

export function useScenarioControls() {
  const scenario = useScenario()
  const queryClient = useQueryClient()
  const [, setParams] = useSearchParams()
  const [resetOnChange, setResetOnChange] = useState(true)
  const [status, setStatus] = useState<Status>('idle')

  async function select(id: ScenarioId, seed = scenario.seed) {
    setStatus('applying')
    // Requests still in flight belong to the previous scenario. Aborting them first keeps their
    // cancellations out of the new scenario's log, which starts empty once it is applied.
    await queryClient.cancelQueries()
    try {
      await applyScenario(id, seed)
    } catch {
      setStatus('failed')
      return
    }
    // The URL always reproduces what is running, so it can be copied and shared.
    setParams(toLabParams({ id, seed }), { replace: true })
    // Cached data would otherwise answer instead of the new scenario and hide its behavior.
    // Not awaited: with a failing scenario this includes every retry.
    if (resetOnChange) void queryClient.resetQueries()
    setStatus('idle')
  }

  return {
    scenario,
    status,
    resetOnChange,
    setResetOnChange,
    select,
    resetCache: () => void queryClient.resetQueries(),
    refetch: () => void queryClient.invalidateQueries(),
  }
}
