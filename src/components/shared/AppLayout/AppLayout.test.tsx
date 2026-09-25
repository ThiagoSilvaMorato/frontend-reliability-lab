import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { RouteObject } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POKEAPI_BASE_URL } from '@/api/config'
import { fetchPokemon } from '@/api/shared/pokemon'
import { pokemonFixture } from '@/mocks/fixtures/pokemon'
import { server } from '@/mocks/server'
import { renderApp } from '@/test/renderApp'
import { AppLayout } from './AppLayout'

const detailUrl = `${POKEAPI_BASE_URL}/pokemon/:nameOrId`

let broken = true
function Fragile() {
  if (broken) throw new Error('boom')
  return <p>page ok</p>
}

// Throws to the nearest boundary, the way a page using `throwOnError` would.
function PikachuPage() {
  const { data } = useQuery({
    queryKey: ['pokemon', 'pikachu'],
    queryFn: ({ signal }) => fetchPokemon('pikachu', signal),
    throwOnError: true,
  })
  return data ? <p>{data.name} loaded</p> : <p>loading</p>
}

function layoutWith(index: RouteObject['element'], other: RouteObject['element'] = <p>other</p>) {
  return [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: index },
        { path: 'lab', element: other },
      ],
    },
  ]
}

describe('AppLayout error handling', () => {
  beforeEach(() => {
    broken = true
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('shows an error state inside the layout and keeps navigation usable', async () => {
    renderApp({ routes: layoutWith(<Fragile />) })

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })

  it('clears the error when the user navigates to another page', async () => {
    const { user } = renderApp({ routes: layoutWith(<Fragile />) })
    await screen.findByRole('alert')

    await user.click(screen.getByRole('link', { name: 'Reliability Lab' }))

    expect(screen.getByText('other')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('retries after an HTTP 500: error → retry → recovery without a page reload', async () => {
    let requests = 0
    let serverIsDown = true
    server.use(
      http.get(detailUrl, () => {
        requests++
        return serverIsDown
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(pokemonFixture('pikachu'))
      }),
    )
    const { user } = renderApp({ routes: layoutWith(<PikachuPage />) })

    // The retry policy makes 3 attempts before the error reaches the user.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('HTTP 500')
    expect(alert).toHaveTextContent('The server had a problem')
    expect(requests).toBe(3)

    serverIsDown = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('pikachu loaded')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not offer a retry for a 404 and does not retry it automatically', async () => {
    let requests = 0
    server.use(
      http.get(detailUrl, () => {
        requests++
        return HttpResponse.json({ status: 404, message: 'Not Found' }, { status: 404 })
      }),
    )
    renderApp({ routes: layoutWith(<PikachuPage />) })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Not found')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    await waitFor(() => expect(requests).toBe(1))
  })
})
