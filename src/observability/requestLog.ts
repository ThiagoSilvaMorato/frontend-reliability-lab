import type { RequestLogEntry } from '@/models/observability'

// External store (useSyncExternalStore-compatible). Written by the HTTP client, read by the Lab UI.
// Bounded so a long session cannot grow memory without limit.
const MAX_ENTRIES = 200

let entries: readonly RequestLogEntry[] = []
let lastId = 0
const listeners = new Set<() => void>()

function commit(next: readonly RequestLogEntry[]) {
  entries = next
  listeners.forEach((listener) => listener())
}

export const requestLog = {
  nextId: () => ++lastId,
  record: (entry: RequestLogEntry) => commit([...entries, entry].slice(-MAX_ENTRIES)),
  update: (id: number, patch: Partial<RequestLogEntry>) =>
    commit(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))),
  clear: () => commit([]),
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => entries,
}
