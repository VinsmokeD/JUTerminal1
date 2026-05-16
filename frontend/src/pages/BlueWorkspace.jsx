import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import RoeBriefing from '../components/workspace/RoeBriefing'
import WorkspaceTopBar from '../components/workspace/WorkspaceTopBar'
import Terminal from '../components/terminal/Terminal'
import GuidedNotebook from '../components/notes/GuidedNotebook'
import AiHintPanel from '../components/hints/AiHintPanel'
import Badge from '../components/ui/Badge'
import api from '../lib/api'

const PLAYBOOKS = {
  'SC-01': [
    { step: 'Identify source IP of all HIGH/CRITICAL WAF alerts', hint: 'Look at the source_ip field in SIEM events' },
    { step: 'Correlate WAF events with Apache access log timestamps', hint: 'Events within seconds of each other likely share a cause' },
    { step: 'Determine if SQLi attempt resulted in a 200 response', hint: 'A 200 response to a SQL injection attempt means it succeeded' },
    { step: 'Check if any PHP files were uploaded to /uploads/', hint: 'File upload + PHP = potential webshell' },
    { step: 'Identify affected patient record IDs via IDOR alerts', hint: 'Sequential ID access patterns indicate IDOR exploitation' },
    { step: 'Block source IP at WAF level', hint: 'Document the exact firewall rule you would create' },
    { step: 'Reset any exposed credentials', hint: 'Any credentials visible in SQLi output are compromised' },
    { step: 'Write IR report: timeline, IOCs, affected data, RCA', hint: 'The report is the deliverable — structure it with clear sections' },
  ],
  'SC-02': [
    { step: 'Identify Event 4769 with RC4 encryption (0x17)', hint: 'RC4 in Kerberos TGS requests is the signature of Kerberoasting' },
    { step: 'Determine which account was Kerberoasted', hint: 'Check the TargetUserName field in Event 4769' },
    { step: 'Correlate 4769 with 4768 (TGT request) timestamps', hint: 'TGT request immediately before TGS request confirms the chain' },
    { step: 'Identify lateral movement: Event 4624 Type 3', hint: 'Type 3 logons from non-standard IPs indicate lateral movement' },
    { step: 'Alert on Event 4625 bursts (credential spray)', hint: 'Multiple 4625 events from one IP = credential spray/brute force' },
    { step: 'CRITICAL: Event 4662 with replication rights = DCSync', hint: 'DCSync is the final stage — escalate immediately' },
    { step: 'Disable compromised svc_backup account', hint: 'Any Kerberoasted account with cracked password must be disabled' },
    { step: 'Force Kerberos ticket expiry (purge all TGTs)', hint: 'Prevents use of stolen tickets' },
    { step: 'Document full lateral movement path', hint: 'Source host -> destination -> technique used for each hop' },
    { step: 'Write IR report with AD hardening recommendations', hint: 'Include: disable RC4, SPN cleanup, tiered admin model' },
  ],
  'SC-03': [
    { step: 'Review email headers: SPF, DKIM, DMARC results', hint: 'Headers reveal whether the email passed authentication checks' },
    { step: 'Check if sending IP is in SPF record', hint: 'SPF failures mean the sender is unauthorized' },
    { step: 'Check DMARC alignment', hint: 'From domain vs envelope sender mismatch = spoofing' },
    { step: 'Identify which recipients opened the email', hint: 'Tracking pixel fires in SIEM events show who opened it' },
    { step: 'Check for macro execution (Event 4688)', hint: 'Office process spawning cmd.exe is the indicator' },
    { step: 'Identify PowerShell download cradle (Event 4104)', hint: 'Script block logging captures the actual PowerShell commands' },
    { step: 'Look for scheduled task creation (persistence)', hint: 'Attackers create scheduled tasks to survive reboots' },
    { step: 'Block external C2 IP at perimeter firewall', hint: 'The reverse shell destination IP is the C2 server' },
    { step: 'Isolate endpoints that executed the payload', hint: 'Any host that ran the macro needs isolation' },
    { step: 'Write phishing IR report with IOC list', hint: 'Include: sender domain, attachment hash, C2 IP, email security recommendations' },
  ],
}

const NIST_PHASES = {
  1: { name: 'Identify', desc: 'Determine what assets are affected. Correlate source IPs across events.' },
  2: { name: 'Detect & Analyze', desc: 'Confirm the attack is real. Build the attack timeline. Identify the technique.' },
  3: { name: 'Contain', desc: 'Stop the bleeding without destroying evidence. Isolate hosts, block C2 IPs.' },
  4: { name: 'Eradicate', desc: 'Remove attacker presence. Hunt for persistence: registry keys, scheduled tasks.' },
  5: { name: 'Recover', desc: 'Restore from known-good backups. Verify integrity. Monitor for reinfection.' },
  6: { name: 'Post-Incident', desc: 'Write IR report: timeline, IOC list, root cause, prevention recommendations.' },
}

export default function BlueWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score, siemEvents, aiMode, setSiemEvents } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const [session, setSession] = useState(currentSession)
  const [roeAcked, setRoeAcked] = useState(currentSession?.roe_acknowledged ?? false)
  const [siemFilter, setSiemFilter] = useState('')
  const [checkedSteps, setCheckedSteps] = useState({})
  const [iocs, setIocs] = useState([])
  const [iocInput, setIocInput] = useState('')
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [activePanel, setActivePanel] = useState('siem')
  const [triageSaving, setTriageSaving] = useState(null)
  const writeOutputRef = useRef(null)

  const { sendRawInput, sendCommand, requestHint, toggleMode, connectionState } = useWebSocket(sessionId)

  const handleRawInput = useCallback((data) => { sendRawInput(data) }, [sendRawInput])
  const handleCommand = useCallback((cmd) => { sendCommand(cmd) }, [sendCommand])

  useEffect(() => {
    if (!session) {
      api.get(`/sessions/${sessionId}`)
        .then(r => { setSession(r.data); setRoeAcked(r.data.roe_acknowledged) })
        .catch(() => navigate('/dashboard'))
    }
    api.get(`/sessions/${sessionId}/events`).then(r => setSiemEvents(r.data || [])).catch(() => {})
  }, [session, sessionId, navigate, setSiemEvents])

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const criticalCount = siemEvents.filter(e => e.severity === 'CRITICAL').length
  const highCount = siemEvents.filter(e => e.severity === 'HIGH').length

  // SIEM filtering
  const filteredEvents = siemEvents.filter(e => {
    if (!siemFilter) return true
    const q = siemFilter.toLowerCase()
    if (q.includes(':')) {
      const [field, val] = q.split(':')
      if (field === 'severity') return e.severity?.toLowerCase() === val.toLowerCase()
      if (field === 'source_ip' || field === 'ip') return e.source_ip?.includes(val)
      if (field === 'source') return e.source?.toLowerCase() === val.toLowerCase()
    }
    return JSON.stringify(e).toLowerCase().includes(q)
  })

  const addIoc = () => {
    if (!iocInput.trim()) return
    setIocs(p => [...p, { value: iocInput.trim(), ts: new Date().toLocaleTimeString(), type: _classifyIoc(iocInput.trim()) }])
    setIocInput('')
  }

  const saveTriage = async (eventId, classification, notes) => {
    setTriageSaving(eventId)
    try {
      const res = await api.put(`/sessions/${sessionId}/triage`, {
        event_id: eventId,
        classification,
        notes,
      })
      setSiemEvents(siemEvents.map((event) => (
        event.id === eventId ? { ...event, triage: res.data } : event
      )))
    } finally {
      setTriageSaving(null)
    }
  }

  if (!session) return <div className="min-h-screen bg-void flex items-center justify-center text-txt-dim text-sm font-mono">Loading...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  const playbook = PLAYBOOKS[session.scenario_id] || PLAYBOOKS['SC-01']
  const nist = NIST_PHASES[phase] || NIST_PHASES[1]

  return (
    <div className="workspace-shell font-display">
      <WorkspaceTopBar
        role="blue"
        sessionId={sessionId}
        scenarioId={session.scenario_id}
        methodology="nist"
        phase={phase}
        score={score}
        aiMode={aiMode}
        elapsed={elapsed}
        connection={connectionState}
      />

      {/* Alert summary strip (blue-team-specific overlay) */}
      {(criticalCount > 0 || highCount > 0) && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-1/60 border-b border-cs-border">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-txt-dim">Active alerts</span>
          {criticalCount > 0 && (
            <Badge tone="red" dot className="animate-pulse-soft">{criticalCount} Critical</Badge>
          )}
          {highCount > 0 && (
            <Badge tone="red">{highCount} High</Badge>
          )}
          <span className="ml-auto text-[10.5px] font-mono text-txt-dim">NIST IR — {nist.name}</span>
        </div>
      )}

      {/* Main grid */}
      <div className="workspace-grid">

        {/* Left panel — SIEM Console / Terminal toggle, spans 2 rows */}
        <div className="workspace-pane workspace-terminal-pane">
          <div className="absolute inset-0 bg-blue-surface opacity-30" />
          <div className="workspace-panel-header relative z-10 flex-wrap">
            <div className="flex gap-1 bg-surface-3 rounded-cs-sm p-0.5">
              <button onClick={() => setActivePanel('siem')}
                className={`text-xs px-3 py-1 rounded-cs-sm transition-all font-mono font-medium ${
                  activePanel === 'siem' ? 'bg-cs-blue/10 text-cs-blue shadow-sm' : 'text-txt-dim hover:text-txt-secondary'
                }`}>
                SIEM
              </button>
              <button onClick={() => setActivePanel('terminal')}
                className={`text-xs px-3 py-1 rounded-cs-sm transition-all font-mono font-medium ${
                  activePanel === 'terminal' ? 'bg-cs-blue/10 text-cs-blue shadow-sm' : 'text-txt-dim hover:text-txt-secondary'
                }`}>
                Terminal
              </button>
            </div>
            {activePanel === 'siem' && (
              <>
                <div className="min-w-[220px] flex-1 md:mx-2">
                  <input
                    value={siemFilter}
                    onChange={e => setSiemFilter(e.target.value)}
                    placeholder="Filter: severity:HIGH, source_ip:172.20.1.10, or free text..."
                    className="input text-xs py-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="dot-live" />
                  <span className="text-green-signal text-xs font-mono">live</span>
                </div>
                <span className="text-xs text-txt-dim font-mono">{filteredEvents.length} events</span>
              </>
            )}
            {activePanel === 'terminal' && (
              <span className="text-xs text-txt-dim ml-2 font-mono">Investigation shell — tshark, grep logs, check configs</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden relative z-10">
            {activePanel === 'siem' ? (
              <div className="h-full overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="p-4 text-xs text-txt-dim text-center font-mono">
                    {siemFilter ? 'No events match your filter.' : 'Waiting for events...'}
                  </div>
                ) : (
                  <div className="divide-y divide-cs-border/20">
                    {filteredEvents.map((event, i) => (
                      <SiemEventRow key={event.id} event={event} expanded={expandedEvent === event.id}
                        onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                        onExtractIoc={(val) => { setIocs(p => [...p, { value: val, ts: new Date().toLocaleTimeString(), type: _classifyIoc(val) }]) }}
                        onTriageSave={saveTriage}
                        triageSaving={triageSaving === event.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Terminal sessionId={sessionId} onData={handleRawInput} onCommand={handleCommand} pendingOutput={writeOutputRef} connectionState={connectionState} />
            )}
          </div>
        </div>

        {/* IR Playbook — top right */}
        <div className="workspace-pane workspace-side-pane">
          <div className="workspace-panel-header">
            <span className="panel-header-dot purple" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: '#a855f7' }}>IR Playbook</span>
            <span className="text-xs text-txt-dim ml-auto font-mono">{Object.values(checkedSteps).filter(Boolean).length}/{playbook.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {playbook.map((item, i) => (
              <label key={i} className="flex items-start gap-2 cursor-pointer group">
                <input type="checkbox" checked={!!checkedSteps[i]} onChange={() => setCheckedSteps(p => ({ ...p, [i]: !p[i] }))}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-surface-4 bg-surface-2 cursor-pointer flex-shrink-0 accent-cs-blue" />
                <div className="flex-1">
                  <span className={`text-xs leading-relaxed transition-colors ${checkedSteps[i] ? 'text-txt-dim line-through' : 'text-txt-secondary group-hover:text-txt-primary'}`}>
                    {item.step}
                  </span>
                  {skillLevel === 'beginner' && !checkedSteps[i] && (
                    <p className="text-xs text-txt-dim mt-0.5 italic">{item.hint}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* AI Tutor + NIST — middle right */}
        <div className="workspace-pane workspace-side-pane">
          <div className="workspace-panel-header">
            <span className="panel-header-dot blue" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cs-blue">AI Tutor</span>
            <span className="text-xs text-cs-blue bg-cs-blue-dim border border-cs-blue/20 px-1.5 py-0.5 rounded-cs-sm ml-auto font-mono">
              NIST: {nist.name}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <AiHintPanel onRequestHint={requestHint} onToggleMode={toggleMode} />
          </div>
        </div>

        {/* Bottom — Notebook + IOCs */}
        <div className="workspace-bottom-split">
          {/* Notebook */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-cs-border">
            <div className="workspace-panel-header">
              <span className="panel-header-dot amber" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-warn">IR Notebook</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <GuidedNotebook sessionId={sessionId} role="blue" phase={phase} />
            </div>
          </div>

          {/* IOC Panel */}
          <div className="workspace-ioc-panel flex flex-col overflow-hidden">
            <div className="workspace-panel-header">
              <span className="panel-header-dot purple" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: '#a855f7' }}>IOCs</span>
              <span className="text-xs text-txt-dim ml-auto font-mono">{iocs.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {iocs.length === 0 ? (
                <p className="text-xs text-txt-dim p-2 font-mono">Click IPs, hashes, or domains in SIEM events to extract them here.</p>
              ) : (
                <div className="space-y-1">
                  {iocs.map((ioc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-cs-sm border border-purple-500/20 bg-purple-500/5">
                      <span className={`px-1 py-0.5 rounded-cs-sm text-xs font-mono ${
                        ioc.type === 'ip' ? 'text-green-signal bg-green-signal/10' :
                        ioc.type === 'hash' ? 'text-amber-warn bg-amber-warn/10' :
                        'text-cs-blue bg-cs-blue-dim'
                      }`}>{ioc.type}</span>
                      <span className="font-mono text-purple-300 flex-1 truncate">{ioc.value}</span>
                      <span className="text-txt-dim font-mono">{ioc.ts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-cs-border p-2 flex gap-1.5">
              <input value={iocInput} onChange={e => setIocInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIoc()}
                placeholder="Add IOC..."
                className="input text-xs py-1.5 font-mono" />
              <button onClick={addIoc} className="px-2.5 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-cs-sm transition-colors font-mono">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SiemEventRow({ event, expanded, onToggle, onExtractIoc, onTriageSave, triageSaving }) {
  const [classification, setClassification] = useState(event.triage?.classification || '')
  const [notes, setNotes] = useState(event.triage?.notes || '')
  const [triageError, setTriageError] = useState('')
  const sevStyles = {
    CRITICAL: 'sev-crit',
    HIGH: 'sev-high',
    MEDIUM: 'sev-med',
    MED: 'sev-med',
    LOW: 'sev-low',
    INFO: 'sev-info',
  }
  const isBackground = event.source === 'background'
  const ts = new Date(event.timestamp || event.created_at || Date.now()).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const activeTriage = TRIAGE_OPTIONS.find((option) => option.value === classification)

  useEffect(() => {
    setClassification(event.triage?.classification || '')
    setNotes(event.triage?.notes || '')
    setTriageError('')
  }, [event.id, event.triage?.classification, event.triage?.notes])

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
    <div className={`siem-event-row siem-event-enter cursor-pointer select-none ${isBackground ? 'opacity-35 hover:opacity-60' : 'hover:bg-white/[0.02]'}`} onClick={onToggle}>
      <span className="siem-time text-left">{ts}</span>
      <span className={`badge ${sevStyles[event.severity] || 'sev-info'} justify-center mx-auto w-full`} style={{ display: 'flex' }}>
        {event.severity}
      </span>
      <span className={`min-w-0 truncate text-xs leading-relaxed ${isBackground ? 'text-txt-dim' : 'text-txt-secondary'}`}>
        {event.message}
        {event.source_ip && (
          <button onClick={(e) => { e.stopPropagation(); onExtractIoc(event.source_ip) }}
            className="ml-2 text-[10.5px] text-green-signal/60 hover:text-green-signal font-mono px-1 rounded-cs-sm bg-green-signal/5 hover:bg-green-signal/15"
            title="Extract as IOC">
            {event.source_ip}
          </button>
        )}
        {event.mitre_technique && (
          <span className="siem-mitre ml-1.5">{event.mitre_technique}</span>
        )}
        {activeTriage ? (
          <span className={`badge ${activeTriage.badgeClass} ml-1.5`}>{activeTriage.label}</span>
        ) : (
          <span className="ml-1.5 text-[10px] font-mono text-txt-dim">untriaged</span>
        )}
      </span>
      {expanded && (
        <div className="col-start-1 col-end-4 pb-2 pt-2 animate-slide-in-up mt-1 border-t border-cs-border/30">
          <pre className="text-[10.5px] text-green-signal font-mono whitespace-pre-wrap bg-surface-1 rounded-cs-sm p-3 border border-cs-border">
            {event.raw_log || JSON.stringify(event, null, 2)}
          </pre>
          <div className="mt-2 rounded-cs-sm border border-cs-border bg-surface-1/80 p-3" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-cs-blue">Analyst triage</p>
                <p className="mt-1 text-xs text-txt-dim">{_triagePrompt(event)}</p>
              </div>
              {event.triage?.updated_at && (
                <span className="text-[10px] font-mono text-txt-dim">
                  saved {new Date(event.triage.updated_at).toLocaleTimeString()}
                </span>
              )}
            </div>
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
              className="input mt-2 min-h-[68px] resize-none text-xs font-mono"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriageSave}
                disabled={triageSaving}
                className="btn btn-blue px-3 py-1.5 text-[10.5px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {triageSaving ? 'Saving...' : 'Save triage'}
              </button>
              {triageError && <span className="text-[10.5px] font-mono text-cs-red">{triageError}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
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

function _classifyIoc(val) {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(val)) return 'ip'
  if (/^[a-f0-9]{32,}$/i.test(val)) return 'hash'
  if (val.includes('.') && !val.includes(' ')) return 'domain'
  return 'other'
}
