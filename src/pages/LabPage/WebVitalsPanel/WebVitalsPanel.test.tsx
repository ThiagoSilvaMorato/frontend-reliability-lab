import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}))

// Each test gets a fresh module graph: the store is a plain singleton, not a mock restoreMocks
// resets, so isolation has to come from re-importing rather than from test setup.
beforeEach(() => {
  vi.resetModules()
})

async function renderPanel() {
  // I18nProvider must come from the same fresh module graph as WebVitalsPanel after resetModules,
  // otherwise its React Context identity differs from the one WebVitalsPanel's useI18n reads from.
  const { I18nProvider } = await import('@/i18n')
  const { startWebVitals } = await import('@/observability/webVitals')
  const { WebVitalsPanel } = await import('./WebVitalsPanel')
  const collectors = await import('web-vitals')
  startWebVitals()
  render(
    <I18nProvider>
      <WebVitalsPanel />
    </I18nProvider>,
  )
  return {
    report: (name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB', value: number, rating: string) => {
      const collector = {
        LCP: collectors.onLCP,
        INP: collectors.onINP,
        CLS: collectors.onCLS,
        FCP: collectors.onFCP,
        TTFB: collectors.onTTFB,
      }[name]
      const callback = vi.mocked(collector).mock.calls[0]?.[0]
      if (!callback) throw new Error(`${name} collector was not registered`)
      // The store notifies React outside of any event handler, so the update needs an explicit act()
      // the way `onlineManager.setOnline(...)` does elsewhere in this codebase's tests.
      act(() => callback({ name, value, rating } as never))
    },
  }
}

describe('WebVitalsPanel', () => {
  it('shows every metric as pending before anything is reported', async () => {
    await renderPanel()

    expect(screen.getAllByText('measuring…')).toHaveLength(5)
    for (const name of ['LCP', 'INP', 'CLS', 'FCP', 'TTFB']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('renders a reported value with its unit and rating', async () => {
    const { report } = await renderPanel()

    report('LCP', 2431, 'needs-improvement')

    expect(screen.getByText('2431 ms')).toBeInTheDocument()
    expect(screen.getByText('needs improvement')).toBeInTheDocument()
  })

  it('formats CLS as a unitless score, not milliseconds', async () => {
    const { report } = await renderPanel()

    report('CLS', 0.234, 'good')

    expect(screen.getByText('0.23')).toBeInTheDocument()
    expect(screen.getByText('good')).toBeInTheDocument()
  })

  it('updates independently per metric as more are reported', async () => {
    const { report } = await renderPanel()

    report('LCP', 1000, 'good')
    expect(screen.getAllByText('measuring…')).toHaveLength(4)

    report('INP', 50, 'good')
    expect(screen.getAllByText('measuring…')).toHaveLength(3)
  })

  it('renders in the selected language', async () => {
    localStorage.setItem('frl.locale', 'pt-BR')
    const { report } = await renderPanel()

    report('TTFB', 300, 'poor')

    expect(screen.getAllByText('medindo…')).toHaveLength(4)
    expect(screen.getByText('300 ms')).toBeInTheDocument()
    expect(screen.getByText('ruim')).toBeInTheDocument()
  })
})
