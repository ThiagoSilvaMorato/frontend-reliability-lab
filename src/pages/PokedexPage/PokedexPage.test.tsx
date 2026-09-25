import { onlineManager } from '@tanstack/react-query'
import { act, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { POKEAPI_BASE_URL } from '@/api/config'
import { pokemonQueries } from '@/api/shared/pokemonQueries'
import { server } from '@/mocks/server'
import { requestLog } from '@/observability/requestLog'
import { renderApp } from '@/test/renderApp'

const LIST_URL = `${POKEAPI_BASE_URL}/pokemon`
const CARD = { name: /^#\d{4}/ }

const requestsMatching = (needle: string) =>
  requestLog.getSnapshot().filter((entry) => entry.url.includes(needle)).length

const cardsShown = () => screen.getAllByRole('link', CARD)

/** Delays list requests starting at `offset`; the request then falls through to the default handler. */
function slowPagesFrom(offset: number, ms: number) {
  server.use(
    http.get(LIST_URL, async ({ request }) => {
      if (Number(new URL(request.url).searchParams.get('offset')) >= offset) await delay(ms)
    }),
  )
}

describe('Pokédex: browsing', () => {
  it('shows a loading state, then the first page with pagination', async () => {
    renderApp()

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')

    expect(await screen.findByRole('link', { name: /Bulbasaur/ })).toBeInTheDocument()
    expect(cardsShown()).toHaveLength(20)
    expect(screen.getByText('60 Pokémon')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  it('moves between pages and keeps the page in the URL', async () => {
    const { user, router } = renderApp()
    await screen.findByRole('link', { name: /Bulbasaur/ })

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('link', { name: /Spearow/ })).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?page=2')

    await user.click(screen.getByRole('button', { name: 'Previous' }))

    expect(await screen.findByRole('link', { name: /Bulbasaur/ })).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('opens directly on the page given in the URL', async () => {
    renderApp({ route: '/?page=3' })

    expect(await screen.findByRole('link', { name: /Zubat/ })).toBeInTheDocument()
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('says so when the page is out of range, and offers a way back', async () => {
    const { user } = renderApp({ route: '/?page=99' })

    expect(await screen.findByText('That page does not exist')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Go to the first page' }))

    expect(await screen.findByRole('link', { name: /Bulbasaur/ })).toBeInTheDocument()
  })
})

describe('Pokédex: performance behaviors', () => {
  it('prefetches the next page, so moving forward makes no new request and shows no loading state', async () => {
    const { user } = renderApp()
    await screen.findByRole('link', { name: /Bulbasaur/ })
    await waitFor(() => expect(requestsMatching('offset=20')).toBe(1))

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Spearow/ })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(requestsMatching('offset=20')).toBe(1)
  })

  it('keeps the previous page visible, marked busy, while the next one loads', async () => {
    slowPagesFrom(20, 150)
    const { user } = renderApp()
    await screen.findByRole('link', { name: /Bulbasaur/ })

    await user.click(screen.getByRole('button', { name: 'Next' }))

    const list = screen.getByRole('list', { busy: true })
    expect(within(list).getByRole('link', { name: /Bulbasaur/ })).toBeInTheDocument()

    expect(await screen.findByRole('link', { name: /Spearow/ })).toBeInTheDocument()
    expect(screen.getByRole('list', { busy: false })).toBeInTheDocument()
  })

  it('aborts the request of a page the user already moved past (race condition)', async () => {
    slowPagesFrom(20, 300)
    const { user } = renderApp()
    await screen.findByRole('link', { name: /Bulbasaur/ })

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('link', { name: /Zubat/ })).toBeInTheDocument()
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Spearow/ })).not.toBeInTheDocument()
    await waitFor(() => {
      const cancelled = requestLog.getSnapshot().filter((entry) => entry.outcome === 'cancelled')
      expect(cancelled.map((entry) => entry.url)).toContainEqual(
        expect.stringContaining('offset=20'),
      )
    })
  })

  it('prefetches a Pokémon on hover and opens it without a loading state', async () => {
    const { user } = renderApp()
    const card = await screen.findByRole('link', { name: /Bulbasaur/ })

    await user.hover(card)
    await waitFor(() => expect(requestsMatching('/pokemon/bulbasaur')).toBe(1))
    await user.click(card)

    expect(screen.getByRole('heading', { level: 1, name: 'Bulbasaur' })).toBeInTheDocument()
    expect(requestsMatching('/pokemon/bulbasaur')).toBe(1)
  })

  it('reuses cached pages when coming back from a Pokémon, and returns to the same page', async () => {
    const { user } = renderApp({ route: '/?page=2' })
    await user.click(await screen.findByRole('link', { name: /Spearow/ }))
    await screen.findByRole('heading', { level: 1, name: 'Spearow' })

    await user.click(screen.getByRole('link', { name: 'Back to the Pokédex' }))

    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Spearow/ })).toBeInTheDocument()
    expect(requestsMatching('offset=20')).toBe(1)
  })
})

describe('Pokédex: search', () => {
  it('filters locally: one download for the whole session, no request per keystroke', async () => {
    const { user, router } = renderApp()
    await screen.findByRole('link', { name: /Bulbasaur/ })
    const search = screen.getByRole('searchbox', { name: 'Search Pokémon' })

    await user.type(search, 'pika')

    expect(await screen.findByRole('link', { name: /Pikachu/ })).toBeInTheDocument()
    expect(cardsShown()).toHaveLength(1)
    expect(screen.getByText('1 Pokémon')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=pika')

    await user.type(search, 'chu')
    expect(cardsShown()).toHaveLength(1)
    expect(requestsMatching('limit=100000')).toBe(1)
  })

  it('goes back to page 1 when the search text changes', async () => {
    const { user, router } = renderApp({ route: '/?page=2' })
    await screen.findByRole('link', { name: /Spearow/ })

    await user.type(screen.getByRole('searchbox'), 'a')

    await screen.findByText(/^\d+ Pokémon$/)
    expect(router.state.location.search).toBe('?q=a')
  })

  it('explains an empty result and lets the user clear the search', async () => {
    const { user } = renderApp()
    await screen.findByRole('link', { name: /Bulbasaur/ })

    await user.type(screen.getByRole('searchbox'), 'zzz')

    expect(await screen.findByText('No Pokémon found')).toBeInTheDocument()
    expect(screen.getByText(/Nothing matches “zzz”/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(await screen.findByRole('link', { name: /Bulbasaur/ })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })
})

describe('Pokédex: failure and recovery', () => {
  it('HTTP 500: retries automatically, shows the error, then recovers on demand without reloading', async () => {
    let serverIsDown = true
    server.use(
      http.get(LIST_URL, () => {
        if (serverIsDown) return new HttpResponse(null, { status: 500 })
      }),
    )
    const { user } = renderApp()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('HTTP 500')
    expect(alert).toHaveTextContent('The server had a problem')
    expect(requestsMatching('limit=20')).toBe(3)

    serverIsDown = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('link', { name: /Bulbasaur/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('malformed response: shown as such and not retried', async () => {
    server.use(http.get(LIST_URL, () => HttpResponse.json({ count: 60, results: 'nope' })))
    renderApp()

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Malformed response')
    expect(alert).toHaveTextContent('Unexpected response')
    expect(requestsMatching('limit=20')).toBe(1)
  })

  it('keeps showing the data, marked as possibly stale, when a refresh fails, and recovers on retry', async () => {
    let serverIsDown = false
    server.use(
      http.get(LIST_URL, () => {
        if (serverIsDown) return new HttpResponse(null, { status: 503 })
      }),
    )
    const { user, queryClient } = renderApp()
    await screen.findByRole('link', { name: /Bulbasaur/ })

    serverIsDown = true
    await act(() => queryClient.invalidateQueries({ queryKey: pokemonQueries.all() }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Could not refresh')
    expect(notice).toHaveTextContent('HTTP 503')
    expect(cardsShown()).toHaveLength(20)

    serverIsDown = false
    await user.click(within(notice).getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(cardsShown()).toHaveLength(20)
  })

  it('offline: waits without failing or sending requests, then loads by itself when the connection returns', async () => {
    onlineManager.setOnline(false)
    renderApp()

    expect(await screen.findByText('Waiting for a connection')).toBeInTheDocument()
    expect(screen.getByText(/You are offline/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(requestLog.getSnapshot()).toHaveLength(0)

    act(() => onlineManager.setOnline(true))

    expect(await screen.findByRole('link', { name: /Bulbasaur/ })).toBeInTheDocument()
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument()
    expect(screen.queryByText('Waiting for a connection')).not.toBeInTheDocument()
  })
})
