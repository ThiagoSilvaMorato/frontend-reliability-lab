import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('boots with the real providers and router on the Pokédex', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })
})
