import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/v3-design.css'
import { PerfTier } from './components/ui/PerfTier'

// Benign, browser-generated noise from ResizeObserver-driven layout (e.g. the
// xterm.js fit addon resizing the terminal). These have no real stack (source
// reports as ":0:0") and are safe to ignore.
// Ref: https://github.com/WICG/resize-observer/issues/38
const BENIGN_ERROR_PATTERNS = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
]

const isBenignError = (message) =>
  typeof message === 'string' && BENIGN_ERROR_PATTERNS.some((p) => message.includes(p))

// Swallow the benign ResizeObserver errors before any reporter sees them.
window.addEventListener(
  'error',
  (event) => {
    if (isBenignError(event?.message)) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  },
  true,
)

window.addEventListener('unhandledrejection', (event) => {
  const message = event?.reason?.message ?? String(event?.reason ?? '')
  if (isBenignError(message)) event.preventDefault()
})

// Log genuinely unexpected errors to the console (non-blocking) instead of
// interrupting the user with an alert() on every error.
window.onerror = function (message, source, line, col, error) {
  if (isBenignError(message)) return true // handled — do not surface
  console.error('[App error]', message, `at ${source}:${line}:${col}`, error)
  return false
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <PerfTier>
    <App />
  </PerfTier>,
)
