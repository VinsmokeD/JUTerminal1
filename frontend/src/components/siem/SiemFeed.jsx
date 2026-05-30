import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import api from '../../lib/api'

// ── Severity palette ────────────────────────────────────────────────────────
const SEV_CFG = {
  CRITICAL: { label: 'CRIT',  hex: '#ff2244', ring: 'ring-[#ff2244]/30', glow: '0 0 8px #ff224480', badgeCls: 'bg-critical/15 text-critical border border-critical/30',   dot: 'bg-critical' },
  HIGH:     { label: 'HIGH',  hex: '#ff7722', ring: 'ring-[#ff7722]/30', glow: '0 0 6px #ff772260', badgeCls: 'bg-high/15 text-high border border-high/30',               dot: 'bg-high' },
  MED:      { label: 'MED',   hex: '#f5a623', ring: 'ring-[#f5a623]/30', glow: '0 0 5px #f5a62350', badgeCls: 'bg-medium/15 text-medium border border-medium/30',         dot: 'bg-medium' },
  MEDIUM:   { label: 'MED',   hex: '#f5a623', ring: 'ring-[#f5a623]/30', glow: '0 0 5px #f5a62350', badgeCls: 'bg-medium/15 text-medium border border-medium/30',         dot: 'bg-medium' },
  LOW:      { label: 'LOW',   hex: '#22aaff', ring: 'ring-[#22aaff]/20', glow: '0 0 4px #22aaff40', badgeCls: 'bg-cs-blue/10 text-cs-blue border border-cs-blue/20',      dot: 'bg-cs-blue' },
  INFO:     { label: 'INFO',  hex: '#4a5568', ring: 'ring-[#4a5568]/20', glow: '',                   badgeCls: 'bg-surface-3 text-txt-dim border border-cs-border',         dot: 'bg-txt-dim' },
}
const getSev = (s) => SEV_CFG[(s || 'INFO').toUpperCase()] || SEV_CFG.INFO

// ── Triage badge config ────────────────────────────────────────────────────
const TRIAGE_CFG = {
  investigating: { cls: 'text-cs-blue border-cs-blue/30 bg-cs-blue/10',   label: '🔍 Investigating' },
  true_positive:  { cls: 'text-critical border-critical/30 bg-critical/10', label: '🔴 True Positive' },
  false_positive: { cls: 'text-green-signal border-green-signal/30 bg-green-signal/10', label: '✓ False Positive' },
  escalated:      { cls: 'text-high border-high/30 bg-high/10',            label: '⚡ Escalated' },
}

const SEVERITY_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MED', 'LOW', 'INFO']

const isNoiseEvent = (ev) =>
  ev?.noise === true || ev?.source === 'background' || ev?.source_type === 'background'

// ── Simple JSON syntax highlighter ─────────────────────────────────────────
function HighlightedJson({ text }) {
  const colored = useMemo(() => {
    // Try to pretty-print if it's valid JSON
    let display = text
    try {
      const parsed = JSON.parse(text)
      display = JSON.stringify(parsed, null, 2)
    } catch {
      // leave as-is
    }
    // Colorise keys, strings, numbers, booleans
    const escaped = display
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const highlighted = escaped
      .replace(/"([^"]+)":/g, '<span class="text-cs-blue/90">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-signal/90">"$1"</span>')
      .replace(/: (true|false)/g, ': <span class="text-high/90">$1</span>')
      .replace(/: (-?\d+\.?\d*)/g, ': <span class="text-medium/90">$1</span>')
      .replace(/: null/g, ': <span class="text-txt-dim/70">null</span>')
    return highlighted
  }, [text])

  return (
    <pre
      className="text-[10px] font-mono bg-[#070c14] border border-cs-border/50
        rounded-cs-sm px-2.5 py-2 overflow-x-auto whitespace-pre-wrap leading-[1.6]
        max-h-36 overflow-y-auto scrollbar-thin text-txt-dim/80"
      dangerouslySetInnerHTML={{ __html: colored }}
    />
  )
}

export default function SiemFeed({
  enableTriage = false,
  sessionId = null,
  onTriageSave = null,
  triageSaving = null,
  onExtractIoc = null,
} = {}) {
  const events = useSessionStore((s) => s.siemEvents)
  const listRef = useRef(null)
  const prevCountRef = useRef(0)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [hideNoise, setHideNoise] = useState(false)    // default show noise
  const [announcement, setAnnouncement] = useState('')
  const [announcementUrgent, setAnnouncementUrgent] = useState(false)

  // Screen-reader announcements for new events
  useEffect(() => {
    const prev = prevCountRef.current
    if (events.length > prev) {
      const newest = events[0]
      const sev = (newest?.severity || '').toUpperCase()
      const urgent = sev === 'CRITICAL'
      setAnnouncementUrgent(urgent)
      setAnnouncement(`New ${sev} event: ${newest?.message || 'SIEM alert'}`)
    }
    prevCountRef.current = events.length
  }, [events])

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (hideNoise && isNoiseEvent(ev)) return false
      if (filter !== 'ALL') {
        const sev = (ev.severity || 'INFO').toUpperCase()
        if ((sev === 'MEDIUM' ? 'MED' : sev) !== filter) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return (
          ev.message?.toLowerCase().includes(q) ||
          ev.mitre_technique?.toLowerCase().includes(q) ||
          ev.source?.toLowerCase().includes(q) ||
          ev.source_ip?.toLowerCase().includes(q) ||
          ev.raw_log?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [events, filter, search, hideNoise])

  // Auto-scroll to newest unless user filtered
  useEffect(() => {
    if (filter === 'ALL' && !search) {
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [events.length, filter, search])

  const critCount = useMemo(() => events.filter((e) => (e.severity || '').toUpperCase() === 'CRITICAL').length, [events])
  const highCount  = useMemo(() => events.filter((e) => (e.severity || '').toUpperCase() === 'HIGH').length, [events])
  const noiseCount = useMemo(() => events.filter(isNoiseEvent).length, [events])

  return (
    <div className="h-full flex flex-col bg-void overflow-hidden">

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 space-y-2 border-b border-cs-border/60">

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-txt-dim font-mono">
            <span className="dot-live w-1.5 h-1.5" />
            {events.length} events
          </span>
          {critCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold
              bg-critical/15 text-critical border border-critical/30 animate-pulse">
              ⚠ {critCount} CRITICAL
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium
              bg-high/10 text-high border border-high/20">
              {highCount} HIGH
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setHideNoise((v) => !v)}
              className={`text-[10px] px-2 py-0.5 rounded-cs-sm border transition-colors font-mono ${
                hideNoise
                  ? 'text-cs-blue border-cs-blue/30 bg-cs-blue/10'
                  : 'text-txt-dim border-cs-border hover:text-txt-secondary'
              }`}
            >
              {hideNoise ? `noise hidden (${noiseCount})` : 'show noise'}
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Filter by message, MITRE, source IP, raw log…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-xs py-1.5 font-mono w-full"
        />

        {/* Severity pills */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-medium transition-colors ${
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

      {/* ── Event list ────────────────────────────────────────────────── */}
      {/* Screen-reader live region — visually hidden */}
      <span
        className="sr-only"
        aria-live={announcementUrgent ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {announcement}
      </span>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-px p-2 pb-4"
        aria-label="SIEM event feed"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {events.length === 0
          ? <EmptyState />
          : filtered.length === 0
            ? <div className="flex items-center justify-center h-32 text-txt-dim text-xs font-mono">No events match your filter</div>
            : filtered.map((ev, i) => (
                <EventRow
                  key={ev.id || i}
                  event={ev}
                  isNew={i === 0 && events.length > 1}
                  enableTriage={enableTriage}
                  sessionId={sessionId}
                  onTriageSave={onTriageSave}
                  triageSaving={triageSaving === ev.id}
                  onExtractIoc={onExtractIoc}
                />
              ))
        }
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
        <p className="text-txt-dim/60 text-xs mt-0.5">Events appear when the Red Team acts</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="dot-live w-1.5 h-1.5" />
        <span className="text-xs text-green-signal font-mono">SIEM online</span>
      </div>
    </div>
  )
}

// ── Individual event row ───────────────────────────────────────────────────
function EventRow({
  event,
  isNew = false,
  enableTriage = false,
  sessionId = null,
  onTriageSave = null,
  triageSaving = false,
  onExtractIoc = null,
}) {
  const [expanded, setExpanded] = useState(false)
  const [classification, setClassification] = useState(event.triage?.classification || '')
  const [notes, setNotes] = useState(event.triage?.notes || '')
  const [triageError, setTriageError] = useState('')
  const [containmentStatus, setContainmentStatus] = useState(null)

  const sev   = getSev(event.severity)
  const noise = isNoiseEvent(event)
  const triageState = event.triage?.classification || event.triage_state
  const triageCfg = TRIAGE_CFG[triageState]

  const ts = new Date(event.timestamp || event.created_at || Date.now())
    .toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const toggle = useCallback(() => setExpanded((v) => !v), [])

  useEffect(() => {
    setClassification(event.triage?.classification || '')
    setNotes(event.triage?.notes || '')
    setTriageError('')
  }, [event.id, event.triage?.classification, event.triage?.notes])

  const handleContain = async (type, val) => {
    setContainmentStatus({ status: 'loading', detail: 'Submitting simulated containment...' })
    try {
      const res = await api.post(`/siem/${sessionId}/contain`, {
        action_type: type,
        target_value: val
      })
      setContainmentStatus({
        status: res.data?.status || 'success',
        detail: res.data?.detail || 'Simulated containment recorded.',
      })
      setTimeout(() => setContainmentStatus(null), 6000)
    } catch (err) {
      setContainmentStatus({
        status: 'failed',
        detail: err.response?.data?.detail || 'Could not record simulated containment.',
      })
      setTimeout(() => setContainmentStatus(null), 6000)
    }
  }
  const containmentState = containmentStatus?.status

  const handleTriageSave = async (e) => {
    e.stopPropagation()
    if (!classification) {
      setTriageError('Choose a disposition before saving.')
      return
    }
    setTriageError('')
    try {
      await onTriageSave(event.id, classification, notes.trim())
    } catch {
      setTriageError('Could not save triage. Check the session connection and retry.')
    }
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-cs-sm border border-cs-border/40 mb-px
        transition-all duration-150 cursor-pointer select-none
        ${expanded ? 'bg-surface-1/80' : 'bg-surface-1/40 hover:bg-surface-1/70'}
        ${noise ? 'opacity-30 hover:opacity-55' : ''}
        ${isNew ? 'siem-event-new' : ''}`}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && toggle()}
      aria-expanded={expanded}
      aria-label={`${sev.label} event: ${event.message}`}
    >
      {/* ── Severity stripe (left glow bar) ─────────────────────────── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-cs-sm"
        style={{ background: sev.hex, boxShadow: sev.glow }}
      />

      {/* ── Main row content ──────────────────────────────────────────── */}
      <div className="flex items-start gap-2 pl-3 pr-2 py-2 min-w-0">

        {/* Severity badge */}
        <span className={`flex-shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-cs-sm
          uppercase tracking-wide leading-none ${sev.badgeCls}`}>
          {sev.label}
        </span>

        {/* Message + meta */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs leading-snug truncate font-medium ${noise ? 'text-txt-dim' : 'text-txt-secondary'}`}>
            {event.message}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-mono text-txt-dim/60 flex-shrink-0">{ts}</span>
            {event.source_ip && (
              onExtractIoc ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onExtractIoc(event.source_ip)
                  }}
                  className="text-[9px] font-mono text-green-signal/60 hover:text-green-signal bg-green-signal/5 hover:bg-green-signal/15 border border-green-signal/20 px-1.5 py-px rounded-cs-sm flex-shrink-0 transition-colors"
                  title="Extract as IOC"
                >
                  {event.source_ip}
                </button>
              ) : (
                <span className="text-[9px] font-mono text-txt-dim/70 bg-surface-3 border border-cs-border/40 px-1.5 py-px rounded-cs-sm flex-shrink-0">
                  {event.source_ip}
                </span>
              )
            )}
            {event.mitre_technique && !noise && (
              <span className="text-[9px] font-mono text-cs-blue/80 bg-cs-blue/10 border border-cs-blue/20
                px-1.5 py-px rounded-cs-sm flex-shrink-0 hover:text-cs-blue transition-colors"
                title={`MITRE ATT&CK: ${event.mitre_technique}`}>
                {event.mitre_technique}
              </span>
            )}
            {enableTriage ? (
              triageCfg ? (
                <span className={`text-[9px] font-mono px-1.5 py-px rounded-cs-sm border flex-shrink-0 ${triageCfg.cls}`}>
                  {triageCfg.label}
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1.5 py-px rounded-cs-sm border border-cs-border bg-surface-2 text-txt-dim flex-shrink-0">
                  untriaged
                </span>
              )
            ) : (
              triageCfg && (
                <span className={`text-[9px] font-mono px-1.5 py-px rounded-cs-sm border flex-shrink-0 ${triageCfg.cls}`}>
                  {triageCfg.label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          className={`flex-shrink-0 w-3 h-3 text-txt-dim/40 transition-transform duration-150 mt-0.5
            ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── Expanded drawer ───────────────────────────────────────────── */}
      {expanded && (
        <div className="pl-3 pr-2 pb-2.5 space-y-2 border-t border-cs-border/30">

          {/* Meta grid */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 text-[10px] font-mono">
            <MetaField label="Time"   value={event.timestamp || event.created_at || 'live'} />
            {event.source   && <MetaField label="Source"  value={event.source} />}
            {event.source_ip && <MetaField label="Host"    value={event.source_ip} />}
            {event.category && <MetaField label="Category" value={event.category} />}
            {event.cwe      && <MetaField label="CWE"      value={event.cwe} />}
            {event.mitre_technique && (
              <span className="text-txt-dim">
                MITRE:{' '}
                <a
                  href={`https://attack.mitre.org/techniques/${(event.mitre_technique || '').replace('.', '/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-cs-blue hover:underline"
                >
                  {event.mitre_technique}
                </a>
              </span>
            )}
          </div>

          {/* Raw log with JSON highlighting */}
          {event.raw_log && (
            <div onClick={(e) => e.stopPropagation()}>
              <p className="text-[9px] font-mono uppercase text-txt-dim/50 mb-1 tracking-wider">Raw log</p>
              <HighlightedJson text={event.raw_log} />
            </div>
          )}

          {/* Triage note if present */}
          {event.triage_notes && (
            <div className="text-[10px] font-mono text-txt-dim/70 italic border-l-2 border-cs-blue/30 pl-2">
              "{event.triage_notes}"
            </div>
          )}

          {/* Analyst triage form */}
          {enableTriage && (
            <div className="mt-2 rounded-cs-sm border border-cs-border bg-surface-1/80 p-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-cs-blue font-bold">Analyst triage</p>
                  <p className="mt-1 text-xs text-txt-dim">{_triagePrompt(event)}</p>
                </div>

                {/* Quick Containment */}
                <div className="flex gap-2">
                  {event.source_ip && (
                    <button
                      onClick={() => handleContain('block_ip', event.source_ip)}
                      disabled={containmentState === 'loading'}
                      className={`px-2 py-1 rounded-cs-sm border text-[10px] font-mono transition-all ${
                        containmentState === 'success' ? 'bg-green-signal/20 text-green-signal border-green-signal/40' :
                        containmentState === 'failed' ? 'bg-cs-red/20 text-cs-red border-cs-red/40' :
                        'bg-cs-red/10 text-cs-red border-cs-red/30 hover:bg-cs-red/20'
                      }`}
                    >
                      {containmentState === 'loading' ? 'Recording...' : `Sim block ${event.source_ip}`}
                    </button>
                  )}
                </div>
              </div>

              {containmentStatus?.detail && (
                <div className={`mb-3 rounded-cs-sm border px-3 py-2 text-[10.5px] font-mono ${
                  containmentState === 'success'
                    ? 'border-green-signal/25 bg-green-signal/5 text-green-signal'
                    : containmentState === 'loading'
                      ? 'border-cs-blue/25 bg-cs-blue/5 text-cs-blue'
                      : 'border-cs-red/25 bg-cs-red/5 text-cs-red'
                }`}>
                  {containmentStatus.detail}
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                {TRIAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setClassification(option.value); setTriageError('') }}
                    className={`rounded-cs-sm border px-2 py-1.5 text-[10.5px] font-mono transition-all ${
                      classification === option.value
                        ? option.activeClass
                        : 'border-cs-border bg-surface-2 text-txt-dim hover:border-cs-blue/40 hover:text-txt-secondary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Evidence, containment action, or escalation context..."
                className="input mt-2 min-h-[68px] w-full resize-none text-xs font-mono bg-void text-txt-primary border-cs-border focus:border-cs-blue"
              />

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriageSave}
                  disabled={triageSaving}
                  className="btn-v3 btn-v3-blue btn-v3-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {triageSaving ? 'Saving...' : 'Save triage'}
                </button>
                {triageError && <span className="text-[10.5px] font-mono text-cs-red">{triageError}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetaField({ label, value }) {
  return (
    <span className="text-txt-dim">
      {label}: <span className="text-txt-secondary">{value}</span>
    </span>
  )
}

const TRIAGE_OPTIONS = [
  {
    value: 'investigating',
    label: 'Investigating',
    badgeClass: 'sev-info',
    activeClass: 'border-cs-blue/70 bg-cs-blue/10 text-cs-blue shadow-blue-glow',
  },
  {
    value: 'true_positive',
    label: 'True positive',
    badgeClass: 'sev-crit',
    activeClass: 'border-cs-red/70 bg-cs-red/10 text-cs-red shadow-red-glow',
  },
  {
    value: 'false_positive',
    label: 'False positive',
    badgeClass: 'sev-low',
    activeClass: 'border-green-signal/70 bg-green-signal/10 text-green-signal',
  },
  {
    value: 'escalated',
    label: 'Escalated',
    badgeClass: 'sev-high',
    activeClass: 'border-amber-warn/70 bg-amber-warn/10 text-amber-warn',
  },
]

function _triagePrompt(event) {
  if (event.severity === 'CRITICAL') return 'Confirm impact quickly, preserve evidence, and decide whether this needs escalation.'
  if (event.severity === 'HIGH') return 'Correlate with nearby events and decide whether this is actionable or noise.'
  if (event.mitre_technique) return `Map ${event.mitre_technique} to observed evidence before closing the alert.`
  return 'Document why this event matters or why it can be safely dismissed.'
}

