import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

let broken = true

function Fragile() {
  if (broken) throw new Error('boom')
  return <p>healthy</p>
}

function renderBoundary(props: Partial<React.ComponentProps<typeof ErrorBoundary>> = {}) {
  const ui = (keys?: readonly unknown[]) => (
    <>
      <p>outside</p>
      <ErrorBoundary
        {...props}
        resetKeys={keys}
        fallback={({ error, reset }) => (
          <div role="alert">
            <span>failed: {(error as Error).message}</span>
            <button onClick={reset}>retry</button>
          </div>
        )}
      >
        <Fragile />
      </ErrorBoundary>
    </>
  )
  const view = render(ui(props.resetKeys))
  return { ...view, rerenderWithKeys: (keys: readonly unknown[]) => view.rerender(ui(keys)) }
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    broken = true
    // React logs caught render errors; keep test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('contains a render error and keeps the rest of the page alive', () => {
    renderBoundary()

    expect(screen.getByRole('alert')).toHaveTextContent('failed: boom')
    expect(screen.getByText('outside')).toBeInTheDocument()
  })

  it('recovers without a reload when the user retries and the cause is gone', async () => {
    const onReset = vi.fn()
    renderBoundary({ onReset })
    broken = false

    await userEvent.click(screen.getByRole('button', { name: 'retry' }))

    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('stays in the error state if the retry fails again', async () => {
    renderBoundary()

    await userEvent.click(screen.getByRole('button', { name: 'retry' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('recovers on its own when a reset key changes, e.g. navigation', () => {
    const { rerenderWithKeys } = renderBoundary({ resetKeys: ['/a'] })
    broken = false

    rerenderWithKeys(['/a'])
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerenderWithKeys(['/b'])
    expect(screen.getByText('healthy')).toBeInTheDocument()
  })
})
