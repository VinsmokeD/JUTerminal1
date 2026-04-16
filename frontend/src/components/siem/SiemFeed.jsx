import { useRef, useEffect, useMemo, useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'

// ── Severity configuration — SOC aesthetic palette ──────────────────────────
const SEV = {
  CRITICAL: { badge: 'sev-crit', row: 'border-l-critical', label: 'CRIT' },
  HIGH:     { badge: 'sev-high', row: 'border-l-high', label: 'HIGH' },
  MED:      { badge: 'sev-med',  row: 'border-l-medium', label: 'MED' },
  MEDIUM:   { badge: 'sev-med',  row: 'border-l-medium', label: 'MED' },
  LOW:      { badge: 'sev-low',  row: 'border-l-low', label: 'LOW' },
  INFO:     { badge: 'sev-info', row: 'border-l-info', label: 'INFO' },
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
    <div className="h-full flex flex-col bg-void overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 space-y-2 border-b border-cs-border/60">
        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-txt-dim font-mono">{events.length} events</span>
          {critCount > 0 && (
            <span className="badge sev-crit">
              <span className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse" />
              {critCount} CRITICAL
            </span>
          )}
          {highCount > 0 && (
            <span className="badge sev-high">{highCount} HIGH</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setHideNoise((v) => !v)}
              className={`text-xs px-2 py-0.5 rounded-cs-sm border transition-colors font-mono ${
                hideNoise
                  ? 'text-cs-blue border-cs-blue/30 bg-cs-blue-dim'
                  : 'text-txt-dim border-cs-border hover:text-txt-secondary'
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
          className="input text-xs py-1.5 font-mono"
        />

        {/* Severity filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-mono font-medium transition-colors ${
                filter === f
                  ? 'bg-cs-blue/10 text-cs-blue border-cs-blue/30'
                  : 'text-txt-dim border-cs-border hover:text-txt-secondary hover:border-cs-border-glow'
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
          <div className="flex items-center justify-center h-32 text-txt-dim text-xs font-mono">
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
      <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
        <svg className="w-5 h-5 text-txt-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-txt-dim text-xs font-mono">Monitoring active</p>
        <p className="text-txt-dim/60 text-xs mt-0.5">Events will appear when the red team acts</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="dot-live" />
        <span className="text-xs text-green-signal font-mono">SIEM connected</span>
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
      className={`siem-event-row siem-event-enter select-none
        ${isNoise ? 'opacity-35 hover:opacity-60' : 'hover:bg-white/[0.02]'}`}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      aria-label={`${sev.label} severity event: ${event.message}`}
    >
      {/* ── Main row ── */}
      <span className="siem-time text-left">{ts}</span>
      <span className={`badge ${sev.badge} justify-center mx-auto w-full`} style={{ display: 'flex' }}>
        {sev.label}
      </span>

      <span className={`flex-1 text-xs leading-relaxed truncate ${isNoise ? 'text-txt-dim' : 'text-txt-secondary'}`}>
        {event.message}
        {event.mitre_technique && !isNoise && (
          <span className="siem-mitre ml-1.5" title={event.mitre_id}>
            {event.mitre_technique}
          </span>
        )}
      </span>

      {/* ── Expanded details ── */}
      {expanded && (event.raw_log || event.source || event.mitre_id || event.cwe) && (
        <div className="col-start-1 col-end-4 px-1 pb-2 pt-2 space-y-2 animate-slide-in-up mt-1 border-t border-cs-border/30">
          {/* Source + IDs */}
          <div className="flex flex-wrap gap-2 text-[10px] uppercase font-mono">
            {event.source && (
              <span className="text-txt-dim">
                Source: <span className="text-txt-secondary font-mono">{event.source}</span>
              </span>
            )}
            {event.mitre_id && (
              <a
                href={`https://attack.mitre.org/techniques/${event.mitre_id.replace('.', '/')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="siem-mitre hover:opacity-80 underline"
              >
                {event.mitre_id}
              </a>
            )}
            {event.cwe && (
              <span className="text-txt-dim">
                CWE: <span className="text-txt-secondary font-mono">{event.cwe}</span>
              </span>
            )}
            {isNoise && (
              <span className="text-txt-dim/50 ml-auto">noise</span>
            )}
          </div>

          {/* Raw log */}
          {event.raw_log && (
            <pre className="text-[10.5px] text-green-signal font-mono bg-surface-1
              border border-cs-border rounded-cs-sm px-2 py-1.5 overflow-x-auto whitespace-pre-wrap
              leading-relaxed max-h-32 overflow-y-auto">
              {event.raw_log}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
