import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { ApiError, type ApiErrorInfo } from '@/models/api'
import { ErrorState } from './ErrorState'

function show(error: unknown, onRetry?: () => void) {
  return render(
    <I18nProvider>
      <ErrorState error={error} onRetry={onRetry} />
    </I18nProvider>,
  )
}

const api = (info: ApiErrorInfo) => new ApiError(info)

const cases: Array<[string, unknown, { title: string; badge: string; retry: boolean }]> = [
  [
    'offline',
    api({ kind: 'offline' }),
    { title: 'You are offline', badge: 'Offline', retry: true },
  ],
  [
    'network error',
    api({ kind: 'network' }),
    { title: 'Connection problem', badge: 'Network error', retry: true },
  ],
  [
    'timeout',
    api({ kind: 'timeout' }),
    { title: 'The server took too long', badge: 'Timeout', retry: true },
  ],
  [
    'HTTP 404',
    api({ kind: 'http', status: 404 }),
    { title: 'Not found', badge: 'HTTP 404', retry: false },
  ],
  [
    'HTTP 400',
    api({ kind: 'http', status: 400 }),
    { title: 'Request rejected', badge: 'HTTP 400', retry: false },
  ],
  [
    'HTTP 429',
    api({ kind: 'http', status: 429 }),
    { title: 'Too many requests', badge: 'HTTP 429', retry: true },
  ],
  [
    'HTTP 503',
    api({ kind: 'http', status: 503 }),
    { title: 'The server had a problem', badge: 'HTTP 503', retry: true },
  ],
  [
    'malformed response',
    api({ kind: 'malformed', issues: ['id: expected number'] }),
    { title: 'Unexpected response', badge: 'Malformed response', retry: true },
  ],
  [
    'non-API error',
    new TypeError('bug'),
    { title: 'Something went wrong', badge: 'Unexpected error', retry: true },
  ],
]

describe('ErrorState', () => {
  it.each(cases)('describes %s specifically', (_, error, expected) => {
    show(error, vi.fn())

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: expected.title })).toBeInTheDocument()
    expect(screen.getByText(expected.badge)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' }) !== null).toBe(expected.retry)
  })

  it('never shows two different failures with the same message', () => {
    expect(new Set(cases.map(([, , expected]) => expected.title)).size).toBe(cases.length)
  })

  it('does not leak raw error messages to the user', () => {
    show(new TypeError('Cannot read properties of undefined'))
    expect(screen.queryByText(/cannot read properties/i)).not.toBeInTheDocument()
  })

  it('calls onRetry when the user retries', async () => {
    const onRetry = vi.fn()
    show(api({ kind: 'timeout' }), onRetry)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('offers no retry when the caller cannot retry', () => {
    show(api({ kind: 'network' }))
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('renders in the selected language', () => {
    localStorage.setItem('frl.locale', 'pt-BR')
    show(api({ kind: 'offline' }), vi.fn())

    expect(screen.getByRole('heading', { name: 'Você está offline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
