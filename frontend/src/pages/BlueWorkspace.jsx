import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import RoeBriefing from '../components/workspace/RoeBriefing'
import WorkspaceTopBar from '../components/workspace/WorkspaceTopBar'
import LayoutPicker from '../components/workspace/LayoutPicker'
import ResizableSplit from '../components/workspace/ResizableSplit'
import Terminal from '../components/terminal/Terminal'
import GuidedNotebook from '../components/notes/GuidedNotebook'
import AiHintPanel from '../components/hints/AiHintPanel'
import ForensicsWorkbench from '../components/siem/ForensicsWorkbench'
import KillChainView from '../components/killchain/KillChainView'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import api from '../lib/api'
import MissionReadinessOverlay from '../components/workspace/MissionReadinessOverlay'


const NIST_PHASES = {
  1: { name: 'Identify', desc: 'Determine what assets are affected. Correlate source IPs across events.' },
  2: { name: 'Detect & Analyze', desc: 'Confirm the attack is real. Build the attack timeline. Identify the technique.' },
  3: { name: 'Contain', desc: 'Stop the bleeding without destroying evidence. Isolate hosts, block C2 IPs.' },
  4: { name: 'Eradicate', desc: 'Remove attacker presence. Hunt for persistence: registry keys, scheduled tasks.' },
  5: { name: 'Recover', desc: 'Restore from known-good backups. Verify integrity. Monitor for reinfection.' },
  6: { name: 'Post-Incident', desc: 'Write your IR report: full timeline, IOC list, root cause, prevention recommendations.' },
}

const isNoiseEvent = (event) =>
  event?.noise === true || event?.source === 'background' || event?.source_type === 'background'

export default function BlueWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score, siemEvents, aiMode, setSiemEvents, setCurrentSession } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const cachedSession = currentSession?.id === sessionId ? currentSession : null
  const [session, setSession] = useState(cachedSession)
  const [loadingSession, setLoadingSession] = useState(!cachedSession)
  const [roeAcked, setRoeAcked] = useState(cachedSession?.roe_acknowledged ?? false)
  const [siemFilter, setSiemFilter] = useState('')
  const [hideNoise, setHideNoise] = useState(true)
  const [checkedSteps, setCheckedSteps] = useState({})
  const [playbook, setPlaybook] = useState([])
  const [iocs, setIocs] = useState([])
  const [iocInput, setIocInput] = useState('')
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [showKillChain, setShowKillChain] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activePanel, setActivePanel] = useState('siem')
  const [activeBottomTab, setActiveBottomTab] = useState('notebook') // notebook | forensics
  const [triageSaving, setTriageSaving] = useState(null)
  const writeOutputRef = useRef(null)

  const wsSessionId = session && roeAcked ? sessionId : null
  const { sendRawInput, sendCommand, requestHint, toggleMode, connectionState } = useWebSocket(wsSessionId)

  const handleRawInput = useCallback((data) => {
    if (connectionState === 'failed') return
    sendRawInput(data)
  }, [connectionState, sendRawInput])
  const handleCommand = useCallback((cmd) => {
    if (connectionState === 'failed') return
    sendCommand(cmd)
  }, [connectionState, sendCommand])

  useEffect(() => {
    let cancelled = false
    const cached = useSessionStore.getState().currentSession

    if (cached?.id === sessionId) {
      setSession(cached)
      setRoeAcked(Boolean(cached.roe_acknowledged))
      setLoadingSession(false)
    } else {
      setSession(null)
      setRoeAcked(false)
      setLoadingSession(true)
    }
    setSiemEvents([])

    api.get(`/sessions/${sessionId}`)
      .then(r => {
        if (cancelled) return
        setCurrentSession(r.data)
        setSession(r.data)
        setRoeAcked(Boolean(r.data.roe_acknowledged))
      })
      .catch(() => {
        if (!cancelled) navigate('/dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false)
      })

    api.get(`/sessions/${sessionId}/events`)
      .then(r => {
        if (!cancelled) setSiemEvents(r.data || [])
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [sessionId, navigate, setSiemEvents, setCurrentSession])

  useEffect(() => {
    const onHint = (event) => requestHint(event.detail?.level || 1)
    const onMode = (event) => toggleMode(event.detail?.mode || 'learn')
    window.addEventListener('mission:request-hint', onHint)
    window.addEventListener('mission:toggle-ai-mode', onMode)
    return () => {
      window.removeEventListener('mission:request-hint', onHint)
      window.removeEventListener('mission:toggle-ai-mode', onMode)
    }
  }, [requestHint, toggleMode])

  useEffect(() => {
    if (!session?.scenario_id) return
    api.get(`/api/playbooks?scenario=${session.scenario_id}`)
      .then(r => setPlaybook(r.data?.steps || []))
      .catch(() => {})
  }, [session?.scenario_id])

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const signalEvents = siemEvents.filter(e => !isNoiseEvent(e))
  const criticalCount = signalEvents.filter(e => e.severity === 'CRITICAL').length
  const highCount = signalEvents.filter(e => e.severity === 'HIGH').length
  const noiseCount = siemEvents.length - signalEvents.length

  const filteredEvents = siemEvents.filter(e => {
    if (hideNoise && isNoiseEvent(e)) return false
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

  if (loadingSession || !session) return <div className="min-h-screen bg-void flex items-center justify-center text-txt-dim text-sm font-mono">Loading...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  const nist = NIST_PHASES[phase] || NIST_PHASES[1]

  return (
    <div className="workspace-shell font-display">
      <MissionReadinessOverlay sessionId={sessionId} scenarioId={session.scenario_id} />
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
      >
        <button
          onClick={() => setShowKillChain(true)}
          className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 bg-surface-3 border border-cs-border hover:bg-surface-4 hover:text-txt-primary text-txt-secondary rounded-cs-sm transition-colors mr-1"
        >
          View Kill Chain
        </button>
        <LayoutPicker role="blue" scenarioId={session.scenario_id} />
      </WorkspaceTopBar>

      <Modal
        open={showKillChain}
        onClose={() => setShowKillChain(false)}
        title="Live Attack Timeline"
        size="xl"
      >
        <div className="mt-2">
          <KillChainView sessionId={sessionId} role="blue" />
        </div>
      </Modal>

      {connectionState === 'failed' && (
        <div className="sticky top-14 z-50 flex items-center gap-3 bg-cs-red/10 border-b border-cs-red/40 px-5 py-2.5">
          <span className="h-2 w-2 rounded-full bg-cs-red shrink-0" />
          <p className="text-xs font-mono text-cs-red">
            Connection lost. Please refresh the page or contact your instructor.
          </p>
        </div>
      )}

      {(criticalCount > 0 || highCount > 0) && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-1/60 border-b border-cs-border">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-txt-dim">Active alerts</span>
          {criticalCount > 0 && (
            <Badge tone="red" dot className="animate-pulse-soft">{criticalCount} Critical</Badge>
          )}
          {highCount > 0 && (
            <Badge tone="red">{highCount} High</Badge>
          )}
          <span className="ml-auto text-[10.5px] font-mono text-txt-dim">NIST IR - {nist.name}</span>
        </div>
      )}

      <ResizableSplit
        role="blue"
        scenarioId={session.scenario_id}
        slots={{
          mainTop: {
            label: activePanel === 'siem' ? 'SIEM Console' : 'Investigation Terminal',
            element: (
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
                      <button
                        onClick={() => setHideNoise(v => !v)}
                        className={`text-[10.5px] px-2 py-1 rounded-cs-sm border transition-colors font-mono ${
                          hideNoise
                            ? 'text-cs-blue border-cs-blue/30 bg-cs-blue/10'
                            : 'text-txt-dim border-cs-border hover:text-txt-secondary'
                        }`}
                      >
                        {hideNoise ? `noise hidden (${noiseCount})` : `showing noise (${noiseCount})`}
                      </button>
                      <span className="text-xs text-txt-dim font-mono">{filteredEvents.length} events</span>
                    </>
                  )}
                  {activePanel === 'terminal' && (
                    <span className="text-xs text-txt-dim ml-2 font-mono">Investigation shell - tshark, grep logs, check configs</span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden relative z-10">
                  {activePanel === 'siem' ? (
                    <div className="h-full overflow-y-auto" aria-live="polite">
                      {filteredEvents.length === 0 ? (
                        <div className="p-4 text-xs text-txt-dim text-center font-mono">
                          {siemFilter ? 'No events match your filter.' : 'Waiting for events...'}
                        </div>
                      ) : (
                        <div className="divide-y divide-cs-border/20">
                          {filteredEvents.map((event) => (
                            <SiemEventRow key={event.id} event={event} expanded={expandedEvent === event.id}
                              onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                              onExtractIoc={(val) => { setIocs(p => [...p, { value: val, ts: new Date().toLocaleTimeString(), type: _classifyIoc(val) }]) }}
                              onTriageSave={saveTriage}
                              triageSaving={triageSaving === event.id}
                              sessionId={sessionId}
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
            ),
          },
          sideTop: {
            label: 'IR Playbook',
            element: (
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
            ),
          },
          sideBottom: {
            label: 'AI Tutor',
            element: (
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
            ),
          },
          mainBottom: {
            label: activeBottomTab === 'notebook' ? 'IR Notebook' : 'Forensics Workbench',
            element: (
              <div className="workspace-bottom-split h-full flex flex-col">
                <div className="flex bg-surface-2 border-b border-cs-border px-4 py-1 gap-1">
                  <button onClick={() => setActiveBottomTab('notebook')}
                    className={`text-[10px] px-3 py-1 rounded-cs-sm transition-all font-mono uppercase tracking-wider ${
                      activeBottomTab === 'notebook' ? 'bg-cs-blue/10 text-cs-blue font-bold' : 'text-txt-dim hover:text-txt-secondary'
                    }`}>
                    Notebook
                  </button>
                  <button onClick={() => setActiveBottomTab('forensics')}
                    className={`text-[10px] px-3 py-1 rounded-cs-sm transition-all font-mono uppercase tracking-wider ${
                      activeBottomTab === 'forensics' ? 'bg-cs-blue/10 text-cs-blue font-bold' : 'text-txt-dim hover:text-txt-secondary'
                    }`}>
                    Forensics
                  </button>
                </div>

                <div className="flex-1 flex min-h-0 overflow-hidden">
                  {activeBottomTab === 'notebook' ? (
                    <div className="flex flex-1 min-w-0 overflow-hidden">
                      <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-cs-border">
                        <div className="flex-1 overflow-hidden">
                          <GuidedNotebook sessionId={sessionId} role="blue" phase={phase} />
                        </div>
                      </div>

                      <div className="workspace-ioc-panel flex flex-col overflow-hidden w-64">
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
                  ) : (
                    <ForensicsWorkbench sessionId={sessionId} />
                  )}
                </div>
              </div>
            ),
          },
        }}
      />
    </div>
  )
}

function SiemEventRow({ event, expanded, onToggle, onExtractIoc, onTriageSave, triageSaving, sessionId }) {
  const [classification, setClassification] = useState(event.triage?.classification || '')
  const [notes, setNotes] = useState(event.triage?.notes || '')
  const [triageError, setTriageError] = useState('')
  const [containmentStatus, setContainmentStatus] = useState(null)

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
  const sevStyles = {
    CRITICAL: 'sev-crit',
    HIGH: 'sev-high',
    MEDIUM: 'sev-med',
    MED: 'sev-med',
    LOW: 'sev-low',
    INFO: 'sev-info',
  }
  const isBackground = isNoiseEvent(event)
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
    <div className={`siem-event-row siem-event-enter cursor-pointer select-none ${isBackground ? 'noise hover:opacity-60' : 'hover:bg-white/[0.02]'}`} onClick={onToggle}>
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
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-cs-blue">Analyst triage</p>
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
                {/* Process-related alerts could have a kill PID button if we extract it from message */}
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
