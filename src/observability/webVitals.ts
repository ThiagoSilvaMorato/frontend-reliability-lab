import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

export type WebVitalName = Metric['name']
export type WebVitalRating = Metric['rating']

export interface WebVitalEntry {
  name: WebVitalName
  value: number
  rating: WebVitalRating
}

// External store (useSyncExternalStore-compatible), same shape as requestLog/retryCounter: written
// once at startup, read reactively by whatever wants to display it.
let entries: Readonly<Partial<Record<WebVitalName, WebVitalEntry>>> = {}
const listeners = new Set<() => void>()

function record(metric: Metric) {
  entries = {
    ...entries,
    [metric.name]: { name: metric.name, value: metric.value, rating: metric.rating },
  }
  listeners.forEach((listener) => listener())
  // A console line is the whole "shipped to a backend" story here: there is no analytics vendor in
  // this project, and CLAUDE.md is explicit about not building one just to have somewhere to send this.
  console.info(`[web-vitals] ${metric.name}: ${Math.round(metric.value)} (${metric.rating})`)
}

export const webVitals = {
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => entries,
}

/**
 * Registers the five Core Web Vitals collectors once. Real-user metrics, not synthetic: CLS and INP
 * in particular only finalize on visibility changes (tab hidden/closed), so a metric can legitimately
 * stay absent until the user navigates away or switches tabs — that is the library's design, not a bug.
 */
export function startWebVitals() {
  onCLS(record)
  onINP(record)
  onLCP(record)
  onFCP(record)
  onTTFB(record)
}
