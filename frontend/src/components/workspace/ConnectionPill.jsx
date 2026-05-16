/**
 * ConnectionPill — compact WebSocket status indicator with semantic colour.
 *   connected     → green dot, "Live"
 *   connecting    → amber dot, "Connecting"
 *   disconnected  → red dot, "Reconnecting"
 *   unauthorized  → red dot, "Session lost"
 */
const STATE = {
  connected:    { dot: '#00ff88', label: 'Live',          tone: 'text-green-signal' },
  connecting:   { dot: '#ffaa00', label: 'Connecting',    tone: 'text-amber-warn'   },
  disconnected: { dot: '#ff3b3b', label: 'Reconnecting',  tone: 'text-cs-red'       },
  unauthorized: { dot: '#ff2244', label: 'Session lost',  tone: 'text-critical'     },
}

export default function ConnectionPill({ state = 'connecting', className = '' }) {
  const s = STATE[state] || STATE.connecting
  const pulsing = state === 'connected' || state === 'connecting'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-cs-border bg-surface-2 font-mono text-[10.5px] uppercase tracking-[0.1em] ${s.tone} ${className}`}
      aria-live="polite"
      aria-label={`Connection ${s.label}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${pulsing ? 'animate-pulse-soft' : ''}`}
        style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }}
      />
      {s.label}
    </span>
  )
}
