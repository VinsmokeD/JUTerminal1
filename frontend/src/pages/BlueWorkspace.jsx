import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useSiemSync } from '../hooks/useSiemSync'
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
import SiemFeed from '../components/siem/SiemFeed'
import ErrorBoundary from '../components/ErrorBoundary'


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
  const { currentSession, phase, score, siemEvents, aiMode, setSiemEvents, setCurrentSession, setLastVisitedRole } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const cachedSession = currentSession?.id === sessionId ? currentSession : null
  const [session, setSession] = useState(cachedSession)
  const [loadingSession, setLoadingSession] = useState(!cachedSession)
  const [roeAcked, setRoeAcked] = useState(cachedSession?.roe_acknowledged ?? false)
  const [checkedSteps, setCheckedSteps] = useState({})
  const [playbook, setPlaybook] = useState([])
  const [iocs, setIocs] = useState([])
  const [iocInput, setIocInput] = useState('')
  const [showKillChain, setShowKillChain] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activePanel, setActivePanel] = useState('siem')
  const [activeBottomTab, setActiveBottomTab] = useState('notebook') // notebook | forensics
  const [triageSaving, setTriageSaving] = useState(null)
  const writeOutputRef = useRef(null)

  const wsSessionId = session && roeAcked ? sessionId : null
  const { sendRawInput, sendCommand, requestHint, toggleMode, sendTutorQuestion, connectionState } = useWebSocket(wsSessionId)
  // Self-heal the SIEM feed (covers WS reconnect gaps where pub/sub has no replay)
  useSiemSync(wsSessionId, connectionState)

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
    setLastVisitedRole('blue')

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
  }, [sessionId, navigate, setSiemEvents, setCurrentSession, setLastVisitedRole])

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
    api.get(`/playbooks?scenario=${session.scenario_id}`)
      .then(r => setPlaybook(r.data?.steps || []))
      .catch(() => {})
  }, [session?.scenario_id])

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const signalEvents = siemEvents.filter(e => !isNoiseEvent(e))
  const criticalCount = signalEvents.filter(e => (e.severity || '').toUpperCase() === 'CRITICAL').length
  const highCount = signalEvents.filter(e => (e.severity || '').toUpperCase() === 'HIGH').length
  const _noiseCount = siemEvents.length - signalEvents.length

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

  if (loadingSession || !session) return <div className="min-h-dvh bg-void flex items-center justify-center text-txt-secondary text-sm font-mono">Loading...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  const nist = NIST_PHASES[phase] || NIST_PHASES[1]

  return (
    <div className="workspace-shell">
      {/* Mobile notice — workspaces require a keyboard; hide on md+ */}
      <div className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-amber-warn/10 border-b border-amber-warn/30 text-amber-warn text-xs font-mono" role="status">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        This workspace is best experienced on a desktop browser with a physical keyboard.
      </div>
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
        completedAt={session?.completed_at}
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
              <div className="workspace-pane workspace-terminal-pane pane-hl-blue">
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
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="dot-live" />
                      <span className="text-green-signal text-xs font-mono">live</span>
                    </div>
                  )}
                  {activePanel === 'terminal' && (
                    <span className="text-xs text-txt-dim ml-2 font-mono">Investigation shell - tshark, grep logs, check configs</span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden relative z-10">
                  {activePanel === 'siem' ? (
                    <SiemFeed
                      enableTriage={true}
                      sessionId={sessionId}
                      onTriageSave={saveTriage}
                      triageSaving={triageSaving}
                      onExtractIoc={(val) => {
                        setIocs((p) => [
                          ...p,
                          {
                            value: val,
                            ts: new Date().toLocaleTimeString(),
                            type: _classifyIoc(val),
                          },
                        ])
                      }}
                    />
                  ) : (
                    <ErrorBoundary>
                      <Terminal sessionId={sessionId} onData={handleRawInput} onCommand={handleCommand} pendingOutput={writeOutputRef} connectionState={connectionState} />
                    </ErrorBoundary>
                  )}
                </div>
              </div>
            ),
          },
          sideTop: {
            label: 'IR Playbook',
            element: (
              <div className="workspace-pane workspace-side-pane pane-hl-purple">
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
              <div className="workspace-pane workspace-side-pane pane-hl-blue">
                <div className="workspace-panel-header">
                  <span className="panel-header-dot blue" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cs-blue">AI Tutor</span>
                  <span className="text-xs text-cs-blue bg-cs-blue-dim border border-cs-blue/20 px-1.5 py-0.5 rounded-cs-sm ml-auto font-mono">
                    NIST: {nist.name}
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <AiHintPanel onSubmitQuestion={sendTutorQuestion} connectionState={connectionState} />
                </div>
              </div>
            ),
          },
          mainBottom: {
            label: activeBottomTab === 'notebook' ? 'IR Notebook' : 'Forensics Workbench',
            element: (
              <div className="workspace-bottom-split h-full flex flex-col pane-hl-blue">
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



function _classifyIoc(val) {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(val)) return 'ip'
  if (/^[a-f0-9]{32,}$/i.test(val)) return 'hash'
  if (val.includes('.') && !val.includes(' ')) return 'domain'
  return 'other'
}
