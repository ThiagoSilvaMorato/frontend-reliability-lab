import { Component, type ReactNode } from 'react'

interface FallbackArgs {
  error: unknown
  reset: () => void
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: (args: FallbackArgs) => ReactNode
  /** Called when the user asks to retry, e.g. TanStack Query's reset so failed queries refetch. */
  onReset?: () => void
  /** The boundary recovers on its own when any of these change (e.g. navigating to another route). */
  resetKeys?: readonly unknown[]
}

interface ErrorBoundaryState {
  hasError: boolean
  error: unknown
}

const initialState: ErrorBoundaryState = { hasError: false, error: null }

// React has no hook API for error boundaries, so this has to be a class.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state = initialState

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.hasError && keysChanged(previous.resetKeys, this.props.resetKeys)) {
      this.setState(initialState)
    }
  }

  reset = () => {
    this.props.onReset?.()
    this.setState(initialState)
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    return this.props.fallback({ error: this.state.error, reset: this.reset })
  }
}

function keysChanged(previous: readonly unknown[] = [], next: readonly unknown[] = []) {
  return previous.length !== next.length || previous.some((key, i) => !Object.is(key, next[i]))
}
