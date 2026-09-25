import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { POKEAPI_BASE_URL } from '@/api/config'
import { pokemonFixture } from '@/mocks/fixtures/pokemon'
import { server } from '@/mocks/server'
import { requestLog } from '@/observability/requestLog'
import { renderApp } from '@/test/renderApp'

const DETAIL_URL = `${POKEAPI_BASE_URL}/pokemon/:nameOrId`

const requestsMatching = (needle: string) =>
  requestLog.getSnapshot().filter((entry) => entry.url.includes(needle)).length

describe('Pokémon detail', () => {
  it('shows the Pokémon with its facts, abilities and stats', async () => {
    renderApp({ route: '/pokemon/pikachu' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Pikachu' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Types' })).toHaveTextContent('electric')
    expect(screen.getByText('0.7 m')).toBeInTheDocument()
    expect(screen.getByText('6.9 kg')).toBeInTheDocument()
    expect(screen.getByText('Overgrow')).toBeInTheDocument()
    expect(screen.getByText('HP')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(document.title).toBe('Pikachu · Frontend Reliability Lab')
  })

  it('formats numbers and labels for the selected language', async () => {
    localStorage.setItem('frl.locale', 'pt-BR')
    renderApp({ route: '/pokemon/pikachu' })

    expect(await screen.findByText('0,7 m')).toBeInTheDocument()
    expect(screen.getByText('Altura')).toBeInTheDocument()
    expect(screen.getByText('Ataque')).toBeInTheDocument()
  })

  it('normalizes the name in the URL, so different spellings share one request', async () => {
    renderApp({ route: '/pokemon/PIKACHU' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Pikachu' })).toBeInTheDocument()
    expect(requestsMatching('/pokemon/pikachu')).toBe(1)
  })

  it('unknown Pokémon: says not found, offers no retry, and does not retry by itself', async () => {
    renderApp({ route: '/pokemon/missingno' })

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('HTTP 404')
    expect(alert).toHaveTextContent('Not found')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(requestsMatching('/pokemon/missingno')).toBe(1)
    expect(screen.getByRole('link', { name: 'Back to the Pokédex' })).toHaveAttribute('href', '/')
  })

  it('server error: retries, then recovers when the user tries again', async () => {
    let serverIsDown = true
    server.use(
      http.get(DETAIL_URL, () => {
        if (serverIsDown) return new HttpResponse(null, { status: 503 })
      }),
    )
    const { user } = renderApp({ route: '/pokemon/pikachu' })

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503')
    expect(requestsMatching('/pokemon/pikachu')).toBe(3)

    serverIsDown = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Pikachu' })).toBeInTheDocument()
  })

  it('malformed response: rejects the data instead of rendering a broken page', async () => {
    // `undefined` is dropped by JSON serialization, so the body has no `types` at all.
    const withoutTypes = { ...pokemonFixture('pikachu'), types: undefined }
    server.use(http.get(DETAIL_URL, () => HttpResponse.json(withoutTypes)))
    renderApp({ route: '/pokemon/pikachu' })

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Malformed response')
    expect(screen.queryByRole('heading', { level: 1, name: 'Pikachu' })).not.toBeInTheDocument()
    expect(requestsMatching('/pokemon/pikachu')).toBe(1)
  })
})
