import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider, useI18n } from './I18nProvider'

function Probe() {
  const { t, locale, setLocale } = useI18n()
  return (
    <>
      <p>{t('errors.retry')}</p>
      <p data-testid="locale">{locale}</p>
      <button onClick={() => setLocale('pt-BR')}>switch</button>
    </>
  )
}

describe('I18nProvider', () => {
  it('switches language, updates <html lang> and remembers the choice', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByText('Try again')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')

    await user.click(screen.getByRole('button', { name: 'switch' }))

    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('pt-BR')
    expect(localStorage.getItem('frl.locale')).toBe('pt-BR')
  })

  it('starts from the stored locale', () => {
    localStorage.setItem('frl.locale', 'pt-BR')
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('pt-BR')
  })

  it('still works when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'switch' }))

    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('refuses to be used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Probe />)).toThrow(/I18nProvider/)
  })
})
