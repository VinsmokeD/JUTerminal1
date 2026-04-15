import { useRef, useEffect, useMemo, useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'

// ── Severity configuration ─────────────────────────────────────────────────
const SEV = {
  CRITICAL: {
    badge: 'badge-critical',
    row: 'border-l-critical bg-red-500/5 hover:bg-red-500/10',
    dot: 'bg-red-500',
    label: 'CRIT',
  },
  HIGH: {
    badge: 'badge-high',
    row: 'border-l-high bg-orange-500/5 hover:bg-orange-500/10',
    dot: 'bg-orange-500',
    label: 'HIGH',
  },
  MED: {
    badge: 'badge-medium',
    row: 'border-l-medium bg-yellow-500/5 hover:bg-yellow-500/10',
    dot: 'bg-yellow-500',
    label: 'MED',
  },
  MEDIUM: {
    badge: 'badge-medium',
    row: 'border-l-medium bg-yellow-500/5 hover:bg-yellow-500/10',
    dot: 'bg-yellow-500',
    label: 'MED',
  },
  LOW: {
    badge: 'badge-low',
    row: 'border-l-low bg-blue-500/5 hover:bg-blue-500/10',
    dot: 'bg-blue-500',
    label: 'LOW',
  },
  INFO: {
    badge: 'badge-info',
    row: 'border-l-info bg-slate-800/30 hover:bg-slate-800/50',
    dot: 'bg-slate-500',
    label: 'INFO',
  },
}
const getSev = (s) => SEV[(s || 'INFO').toUpperCase()] || SEV.INFO

// ── Filter controls ────────────────────────────────────────────────────────
const SEVERITY_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MED', 'LOW', 'INFO']

export default function SiemFeed() {
  const events = useSessionStore((s) => s.siemEvents)
  const bottomRef = useRef(null)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [hideNoise, setHideNoise] = useState(false)

  const filtered = useMemo(() => {
    return [...events]
      .reverse()
      .filter((ev) => {
        if (hideNoise && ev.noise) return false
        if (filter !== 'ALL') {
          const sev = (ev.severity || 'INFO').toUpperCase()
          const normalised = sev === 'MEDIUM' ? 'MED' : sev
          if (normalised !== filter) return false
        }
        if (search) {
          const q = search.toLowerCase()
          return (
            ev.message?.toLowerCase().includes(q) ||
            ev.mitre_technique?.toLowerCase().includes(q) ||
            ev.source?.toLowerCase().includes(q)
          )
        }
        return true
      })
  }, [events, filter, search, hideNoise])

  // Auto-scroll only when no filter/search active
  useEffect(() => {
    if (!filter || filter === 'ALL') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events.length, filter])

  const critCount = events.filter((e) => (e.severity || '').toUpperCase() === 'CRITICAL').length
  const highCount = events.filter((e) => (e.severity || '').toUpperCase() === 'HIGH').length

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 space-y-2 border-b border-slate-800/60">
        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">{events.length} events</span>
          {critCount > 0 && (
            <span className="badge-critical">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {critCount} CRITICAL
            </span>
          )}
          {highCount > 0 && (
            <span className="badge-high">{highCount} HIGH</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setHideNoise((v) => !v)}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                hideNoise
                  ? 'text-cyan-400 border-cyan-700/50 bg-cyan-950/30'
                  : 'text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
            >
              Hide noise
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Filter events by message, technique, source..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-xs py-1.5 font-mono-terminal"
        />

        {/* Severity filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                filter === f
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Events list ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-px p-2">
        {events.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-600 text-xs font-mono-terminal">
            No events match your filter
          </div>
        ) : (
          filtered.map((ev, i) => <EventRow key={ev.id || i} event={ev} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-800/60 flex items-center justify-center">
        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-slate-600 text-xs font-mono-terminal">Monitoring active</p>
        <p className="text-slate-700 text-xs mt-0.5">Events will appear when the red team acts</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="dot-live" />
        <span className="text-xs text-slate-600 font-mono-terminal">SIEM connected</span>
      </div>
    </div>
  )
}

// ── Individual event row ───────────────────────────────────────────────────
function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false)
  const sev = getSev(event.severity)
  const isNoise = event.noise === true
  const ts = new Date(event.timestamp || event.created_at || Date.now()).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  return (
    <div
      className={`siem-event-enter rounded-r-lg transition-all cursor-pointer select-none
        ${sev.row} ${isNoise ? 'opacity-40 hover:opacity-70' : ''}`}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      aria-label={`${sev.label} severity event: ${event.message}`}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        {/* Severity badge */}
        <span className={`badge ${sev.badge} flex-shrink-0 font-mono-terminal w-14 justify-center`}>
          {sev.label}
        </span>

        {/* Timestamp */}
        <span className="font-mono-terminal text-xs text-slate-600 flex-shrink-0 tabular-nums">
          {ts}
        </span>

        {/* Message */}
        <span className={`flex-1 text-xs leading-relaxed truncate ${isNoise ? 'text-slate-500' : 'text-slate-200'}`}>
          {event.message}
        </span>

        {/* MITRE badge */}
        {event.mitre_technique && !isNoise && (
          <span className="mitre-badge flex-shrink-0" title={event.mitre_id}>
            {event.mitre_technique}
          </span>
        )}

        {/* Noise tag */}
        {isNoise && (
          <span className="text-slate-700 text-xs flex-shrink-0 font-mono-terminal">noise</span>
        )}

        {/* Expand chevron */}
        {(event.raw_log || event.source || event.mitre_id) && !isNoise && (
          <svg
            className={`w-3.5 h-3.5 text-slate-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </div>

      {/* ── Expanded details ── */}
      {expanded && (event.raw_log || event.source || event.mitre_id || event.cwe) && (
        <div className="px-3 pb-2.5 pt-0 space-y-2 animate-slide-in-up">
          {/* Source + IDs */}
          <div className="flex flex-wrap gap-2 text-xs">
            {event.source && (
              <span className="text-slate-500">
                Source: <span className="text-slate-300 font-mono-terminal">{event.source}</span>
              </span>
            )}
            {event.mitre_id && (
              <a
                href={`https://attack.mitre.org/techniques/${event.mitre_id.replace('.', '/')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-purple-400 hover:text-purple-300 underline font-mono-terminal"
              >
                {event.mitre_id}
              </a>
            )}
            {event.cwe && (
              <span className="text-slate-500">
                CWE: <span className="text-slate-400 font-mono-terminal">{event.cwe}</span>
              </span>
            )}
          </div>

          {/* Raw log */}
          {event.raw_log && (
            <pre className="text-xs text-emerald-400 font-mono-terminal bg-slate-900/80
              border border-slate-800 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap
              leading-relaxed max-h-32 overflow-y-auto">
              {event.raw_log}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
