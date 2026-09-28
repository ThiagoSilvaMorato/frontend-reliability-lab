import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '@/api'
import { applyScenario, setWorkerLoader } from '@/mocks/lab'
import { scenarioStore } from '@/mocks/scenarios/scenarioStore'
import { SCENARIO_IDS } from '@/models/reliability'
import { requestLog } from '@/observability/requestLog'
import { renderApp } from '@/test/renderApp'

const radio = (name: RegExp) => screen.getByRole('radio', { name })
const metric = (label: string) => screen.getByText(label).nextElementSibling
const logTable = () => screen.getByRole('table', { name: /Requests since the scenario/ })
const logRows = () => within(logTable()).getAllByRole('row').slice(1)

async function pick(user: ReturnType<typeof renderApp>['user'], name: RegExp) {
  await user.click(radio(name))
}

describe('Reliability Lab page', () => {
  const originalTimeout = httpClient.defaults.timeout

  beforeEach(async () => {
    await applyScenario('normal') // also clears which worker the controller thinks is running
    httpClient.defaults.timeout = 40
  })
  afterEach(() => {
    httpClient.defaults.timeout = originalTimeout
  })

  it('offers every scenario as one accessible group, starting on Normal', async () => {
    renderApp({ route: '/lab' })

    // The Lab route is code-split (ADR 0009): its first render waits on a dynamic import.
    const group = await screen.findByRole('group', { name: 'Scenario' })
    expect(within(group).getAllByRole('radio')).toHaveLength(SCENARIO_IDS.length)
    expect(radio(/^Normal/)).toBeChecked()
    expect(screen.getByText(/Nothing is intercepted/)).toBeInTheDocument()
    expect(await screen.findByText('Pikachu')).toBeInTheDocument()
  })

  it('Normal: shows the successful request, its duration and no failures', async () => {
    renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    expect(logRows()).toHaveLength(1)
    expect(within(logRows()[0]!).getByText('Success')).toBeInTheDocument()
    expect(metric('Requests')).toHaveTextContent('1')
    expect(metric('Failed')).toHaveTextContent('0')
    expect(screen.queryByText(/Recovered/)).not.toBeInTheDocument()
  })

  it('HTTP 500: expected vs observed: 3 attempts, 2 retries, then a server error the user can retry', async () => {
    const { user } = renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    await pick(user, /HTTP 500/)

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500')
    expect(screen.getByText(/retries twice \(3 attempts in total\)/)).toBeInTheDocument()
    expect(within(logTable()).getAllByText('HTTP error')).toHaveLength(3)
    expect(metric('Failed')).toHaveTextContent('3')
    expect(metric('Automatic retries')).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('recovers from a 500 without reloading the page once the scenario returns to Normal', async () => {
    const { user } = renderApp({ route: '/lab' })
    await pick(user, /HTTP 500/)
    await screen.findByRole('alert')

    await pick(user, /^Normal/)

    expect(await screen.findByText('Pikachu')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('HTTP 404: one attempt, no retry, no retry button', async () => {
    const { user } = renderApp({ route: '/lab' })

    await pick(user, /HTTP 404/)

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 404')
    expect(logRows()).toHaveLength(1)
    expect(metric('Automatic retries')).toHaveTextContent('0')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('Network error: retried, and reported as a connection problem rather than a server one', async () => {
    const { user } = renderApp({ route: '/lab' })

    await pick(user, /Network error/)

    expect(await screen.findByRole('alert')).toHaveTextContent('Connection problem')
    expect(within(logTable()).getAllByText('Network error')).toHaveLength(3)
    expect(metric('Automatic retries')).toHaveTextContent('2')
  })

  it('Timeout: every attempt gives up, and no status was ever received', async () => {
    const { user } = renderApp({ route: '/lab' })

    await pick(user, /^Timeout/)

    expect(await screen.findByRole('alert')).toHaveTextContent('The server took too long')
    expect(within(logTable()).getAllByText('Timeout')).toHaveLength(3)
    expect(within(logRows()[0]!).getByText('–')).toBeInTheDocument()
  })

  it('Malformed response: HTTP 200 in the log, but rejected by validation and never retried', async () => {
    const { user } = renderApp({ route: '/lab' })

    await pick(user, /Malformed response/)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unexpected response')
    expect(logRows()).toHaveLength(1)
    const row = within(logRows()[0]!)
    expect(row.getByText('200')).toBeInTheDocument()
    expect(row.getByText('Malformed')).toBeInTheDocument()
    expect(metric('Automatic retries')).toHaveTextContent('0')
  })

  it('Slow response: a loading state, then success, with the latency visible in the log', async () => {
    // The slow scenario must stay below the client timeout, otherwise it would be a timeout.
    scenarioStore.configureTiming({ slowMs: 80 })
    httpClient.defaults.timeout = 2_000
    const { user } = renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    await pick(user, /Slow response/)

    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('Pikachu')).toBeInTheDocument()
    const duration = Number(within(logRows()[0]!).getByText(/ms$/).textContent?.replace(' ms', ''))
    expect(duration).toBeGreaterThanOrEqual(70)
    expect(metric('Automatic retries')).toHaveTextContent('0')
  })

  it('Flaky: the retry policy hides two failures, and the Lab shows the recovery', async () => {
    const { user } = renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    await pick(user, /Flaky/)

    expect(await screen.findByText('Pikachu')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(within(logTable()).getAllByText('HTTP error')).toHaveLength(2)
    expect(await screen.findByText(/succeeded after 2 failed attempts/)).toBeInTheDocument()
    expect(metric('Automatic retries')).toHaveTextContent('2')
  })

  it('Offline (simulated): waits without sending requests, and resumes by itself when left', async () => {
    const { user } = renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    await pick(user, /Offline/)

    expect(await screen.findByText('Waiting for a connection')).toBeInTheDocument()
    expect(screen.getByText(/You are offline/)).toBeInTheDocument()
    expect(metric('Requests')).toHaveTextContent('0')
    expect(screen.getByText(/Connectivity: Offline/)).toBeInTheDocument()

    await pick(user, /^Normal/)

    expect(await screen.findByText('Pikachu')).toBeInTheDocument()
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument()
  })

  it('keeps the scenario in the URL, so it can be shared', async () => {
    const { user, router } = renderApp({ route: '/lab' })

    await pick(user, /HTTP 500/)
    await waitFor(() => expect(router.state.location.search).toBe('?scenario=http500'))

    await pick(user, /^Normal/)
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('Random failure: the seed is in the URL, and replaying it reproduces the same failures', async () => {
    const { user, router } = renderApp({ route: '/lab' })
    await pick(user, /Random failure/)
    const seed = await screen.findByLabelText('Seed')
    const statuses = () => logRows().map((row) => within(row).getAllByRole('cell')[2]?.textContent)

    await user.clear(seed)
    await user.type(seed, '7')
    await user.click(screen.getByRole('button', { name: 'Replay with this seed' }))
    await screen.findByText('Pikachu')
    const firstRun = statuses()

    await user.click(screen.getByRole('button', { name: 'Replay with this seed' }))
    await waitFor(() => expect(statuses()).toEqual(firstRun))
    await screen.findByText('Pikachu')

    expect(router.state.location.search).toBe('?scenario=random&seed=7')
    expect(firstRun).toEqual(['200', '500'])
  })

  it('shows the simulation on every page, and the real Pokédex reacts to it, not just the probe', async () => {
    const { user } = renderApp({ route: '/lab' })
    await pick(user, /HTTP 500/)

    const indicator = await screen.findByRole('link', { name: 'Simulating: HTTP 500' })
    expect(indicator).toHaveAttribute('href', '/lab')

    await user.click(screen.getByRole('link', { name: 'Pokédex' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500')
    expect(screen.getByRole('link', { name: 'Simulating: HTTP 500' })).toBeInTheDocument()
  })

  it('hides the indicator in the Normal scenario', async () => {
    renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    expect(screen.queryByRole('link', { name: /Simulating/ })).not.toBeInTheDocument()
  })

  it('with cache reset off, cached data survives a scenario change and a failed refresh is flagged stale', async () => {
    const { user } = renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')
    await user.click(screen.getByRole('checkbox', { name: /Reset cached data/ }))

    await pick(user, /HTTP 500/)

    expect(screen.getByText('Pikachu')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Refetch' }))

    expect(await screen.findByText('Could not refresh')).toBeInTheDocument()
    expect(screen.getByText('Pikachu')).toBeInTheDocument()
  })

  it('the Reset cache button throws the cached data away and fetches it again', async () => {
    const { user } = renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')
    expect(logRows()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Reset cache' }))

    await waitFor(() => expect(logRows()).toHaveLength(2))
  })

  it('clears the log on demand', async () => {
    const { user } = renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    await user.click(screen.getByRole('button', { name: 'Clear log' }))

    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument()
    expect(requestLog.getSnapshot()).toHaveLength(0)
  })

  it('stays on the current scenario and says so when the simulation cannot start', async () => {
    setWorkerLoader(() => Promise.reject(new Error('no service workers')))
    const { user } = renderApp({ route: '/lab' })

    await pick(user, /HTTP 500/)

    expect(await screen.findByText(/simulation could not start/)).toBeInTheDocument()
    expect(radio(/^Normal/)).toBeChecked()
    setWorkerLoader(() =>
      Promise.resolve({ startWorker: () => Promise.resolve(), stopWorker: () => undefined }),
    )
  })

  it('describes each scenario in the selected language', async () => {
    localStorage.setItem('frl.locale', 'pt-BR')
    const { user } = renderApp({ route: '/lab' })

    await pick(user, /Resposta lenta/)

    expect(screen.getByText(/estado de carregamento fica visível/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Simulando: Resposta lenta' })).toBeInTheDocument()
  })

  it('reacts to a scenario activated from outside the page, such as a shared link', async () => {
    renderApp({ route: '/lab' })
    await screen.findByText('Pikachu')

    await act(() => applyScenario('http404'))

    expect(radio(/HTTP 404/)).toBeChecked()
  })
})

describe('Lab controller cleanup', () => {
  it('leaves no scenario active for the next test', () => {
    vi.useRealTimers()
    expect(scenarioStore.getSnapshot().id).toBe('normal')
  })
})
