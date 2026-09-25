import { onlineManager } from '@tanstack/react-query'
import { act, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('app routes and shell', () => {
  it('renders the Pokédex at / and marks it as the current page', () => {
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pokédex' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Reliability Lab' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('navigates to the Lab and updates the document title', async () => {
    const { user } = renderApp()

    await user.click(screen.getByRole('link', { name: 'Reliability Lab' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Reliability Lab' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reliability Lab' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await waitFor(() => expect(document.title).toBe('Reliability Lab · Frontend Reliability Lab'))
  })

  it('shows a not-found page for unknown URLs and links back home', async () => {
    const { user } = renderApp({ route: '/does-not-exist' })

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to the Pokédex' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeInTheDocument()
  })

  it('switches the whole shell to Portuguese and updates the page language', async () => {
    const { user } = renderApp()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Português (Brasil)' }))

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByText('Explore os Pokémon servidos pela PokéAPI.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Português (Brasil)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(document.documentElement.lang).toBe('pt-BR')
  })

  it('lets keyboard users skip the navigation', async () => {
    const { user } = renderApp()

    await user.tab()

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
  })

  it('shows a banner while offline and removes it when the connection returns', async () => {
    renderApp({ route: '/lab' })
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument()

    act(() => onlineManager.setOnline(false))
    expect(await screen.findByText(/You are offline/)).toBeInTheDocument()

    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument())
  })
})
