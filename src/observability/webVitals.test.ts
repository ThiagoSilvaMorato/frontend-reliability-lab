import { describe, expect, it, vi } from 'vitest'

vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}))

describe('webVitals store', () => {
  it('registers all five Core Web Vitals collectors exactly once', async () => {
    const { startWebVitals } = await import('./webVitals')
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals')

    startWebVitals()

    for (const collector of [onCLS, onINP, onLCP, onFCP, onTTFB]) {
      expect(collector).toHaveBeenCalledTimes(1)
      expect(collector).toHaveBeenCalledWith(expect.any(Function))
    }
  })

  it('records a reported metric and notifies subscribers', async () => {
    const { startWebVitals, webVitals } = await import('./webVitals')
    const { onLCP } = await import('web-vitals')
    startWebVitals()
    const report = vi.mocked(onLCP).mock.calls[0]?.[0]
    if (!report) throw new Error('onLCP was not registered')

    const listener = vi.fn()
    webVitals.subscribe(listener)
    report({ name: 'LCP', value: 1234.5, rating: 'needs-improvement' } as never)

    expect(listener).toHaveBeenCalledOnce()
    expect(webVitals.getSnapshot().LCP).toEqual({
      name: 'LCP',
      value: 1234.5,
      rating: 'needs-improvement',
    })
  })

  it('unsubscribe stops further notifications', async () => {
    const { startWebVitals, webVitals } = await import('./webVitals')
    const { onCLS } = await import('web-vitals')
    startWebVitals()
    const report = vi.mocked(onCLS).mock.calls[0]?.[0]
    if (!report) throw new Error('onCLS was not registered')

    const listener = vi.fn()
    const unsubscribe = webVitals.subscribe(listener)
    unsubscribe()
    report({ name: 'CLS', value: 0.05, rating: 'good' } as never)

    expect(listener).not.toHaveBeenCalled()
  })
})
