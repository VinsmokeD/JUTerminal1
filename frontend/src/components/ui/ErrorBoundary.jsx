import { Component } from 'react'

/**
 * Catches any unhandled React render error and shows a recovery card instead
 * of a blank white screen. Wrap every page-level component in App.jsx.
 */
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[CyberSim ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-center bg-void">
          <div className="text-cs-red text-5xl mb-4 select-none">⚠</div>
          <h2 className="text-txt-primary text-xl font-bold font-display mb-2">
            Something went wrong
          </h2>
          <p className="text-txt-dim text-sm mb-6 max-w-md font-mono">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-cs-blue text-white text-sm rounded hover:bg-blue-500 transition-colors font-mono"
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
