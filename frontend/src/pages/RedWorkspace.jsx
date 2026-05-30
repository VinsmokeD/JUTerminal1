import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import RoeBriefing from '../components/workspace/RoeBriefing'
import WorkspaceTopBar from '../components/workspace/WorkspaceTopBar'
import LayoutPicker from '../components/workspace/LayoutPicker'
import Terminal from '../components/terminal/Terminal'
import SiemFeed from '../components/siem/SiemFeed'
import GuidedNotebook from '../components/notes/GuidedNotebook'
import AiHintPanel from '../components/hints/AiHintPanel'
import KillChainView from '../components/killchain/KillChainView'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import ScoreToast from '../components/ui/ScoreToast'
import api from '../lib/api'
import ErrorBoundary from '../components/ErrorBoundary'

export default function RedWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score, aiMode, siemEvents, setSiemEvents, setCurrentSession, setLastVisitedRole } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const cachedSession = currentSession?.id === sessionId ? currentSession : null
  const [session, setSession] = useState(cachedSession)
  const [loadingSession, setLoadingSession] = useState(!cachedSession)
  const [roeAcked, setRoeAcked] = useState(cachedSession?.roe_acknowledged ?? false)
  const [showWelcome, setShowWelcome] = useState(() => {
    if (skillLevel !== 'beginner') return false
    return !sessionStorage.getItem(`welcome_acked_${sessionId}`)
  })
  const [showKillChain, setShowKillChain] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [siemFlash, setSiemFlash] = useState(false)
  const [toast, setToast] = useState(null)
  const [terminalWidth, setTerminalWidth] = useState(58)
  const siemCountRef = useRef(0)
  const writeOutputRef = useRef(null)
  const containerRef = useRef(null)

  const [phaseMap, setPhaseMap] = useState({})
  const scenarioId = session?.scenario_id

  useEffect(() => {
    if (!scenarioId) return
    fetch(`/api/scenarios/${scenarioId}/phases`)
      .then(r => r.ok ? r.json() : [])
      .then(phases => {
        const map = {}
        phases.forEach(p => { map[p.phase] = (p.mitre || [])[0] || null; })
        setPhaseMap(map)
      })
      .catch(() => {})
  }, [scenarioId])

  const wsSessionId = session && roeAcked ? sessionId : null
  const { sendRawInput, sendCommand, requestHint, toggleMode, sendTutorQuestion, connectionState } = useWebSocket(wsSessionId)

  const handleFlagSubmit = useCallback(async (flagVal) => {
    if (!flagVal) {
      const sessionRes = await api.get(`/sessions/${sessionId}`)
      setSession(sessionRes.data)
      useSessionStore.getState().setScore(sessionRes.data.score)
      useSessionStore.getState().setPhase(sessionRes.data.phase)
      return { valid: true }
    }
    const res = await api.post(`/sessions/${sessionId}/flag`, { flag_value: flagVal })
    if (res.data.valid) {
      const sessionRes = await api.get(`/sessions/${sessionId}`)
      setSession(sessionRes.data)
      useSessionStore.getState().setScore(sessionRes.data.score)
      useSessionStore.getState().setPhase(sessionRes.data.phase)
    }
    return res.data
  }, [sessionId])

  useEffect(() => {
    let cancelled = false
    const cached = useSessionStore.getState().currentSession
    setLastVisitedRole('red')

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
    const onDeduct = (evt) => setToast({ delta: evt.detail.delta, reason: evt.detail.reason })
    window.addEventListener('score:deducted', onDeduct)
    return () => window.removeEventListener('score:deducted', onDeduct)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (siemEvents.length > siemCountRef.current) {
      siemCountRef.current = siemEvents.length
      setSiemFlash(true)
      const t = setTimeout(() => setSiemFlash(false), 2000)
      return () => clearTimeout(t)
    }
  }, [siemEvents.length])

  const handleRawInput = useCallback((data) => {
    if (connectionState === 'failed') return
    sendRawInput(data)
  }, [connectionState, sendRawInput])
  const handleCommand = useCallback((cmd) => {
    if (connectionState === 'failed') return
    sendCommand(cmd)
  }, [connectionState, sendCommand])

  const handleDragStart = useCallback((event) => {
    event.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const handleMove = (moveEvent) => {
      const nextWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100
      setTerminalWidth(Math.min(68, Math.max(42, nextWidth)))
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [])

  if (loadingSession || !session) return <div className="min-h-dvh bg-void flex items-center justify-center text-txt-secondary text-sm font-mono">Loading session...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  const firstTargetIp = session.scenario_id === 'SC-01' ? '172.20.1.20' : session.scenario_id === 'SC-02' ? '172.20.2.20' : '172.20.3.40'
  const terminalPaneWidth = Math.min(68, Math.max(42, terminalWidth))

  return (
    <div className="workspace-shell font-display">
      {toast && (
        <ScoreToast
          delta={toast.delta}
          reason={toast.reason}
          onExpire={() => setToast(null)}
        />
      )}
      <Modal
        open={showWelcome}
        onClose={() => {
          setShowWelcome(false)
          sessionStorage.setItem(`welcome_acked_${sessionId}`, 'true')
        }}
        title="Welcome to your Red Team workspace"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="red" onClick={() => {
              setShowWelcome(false)
              sessionStorage.setItem(`welcome_acked_${sessionId}`, 'true')
            }}>Start training</Button>
          </div>
        }
      >
        <div className="space-y-3.5 text-sm text-txt-secondary">
          {[
            ['cs-red', 'Terminal', 'Type Kali Linux commands here. Every keystroke is sent to your isolated container.'],
            ['cs-blue', 'AI Tutor', 'Watches your moves and offers guidance. Toggle Learn / Challenge mode in the top bar.'],
            ['green-signal', 'SIEM Feed', 'Real-time alerts your actions trigger - exactly what the Blue Team sees.'],
            ['amber-warn', 'Notebook', 'Document findings. Good notes are the difference between a hobbyist and a professional.'],
          ].map(([color, name, body]) => (
            <div key={name} className="flex gap-3 items-start">
              <div className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 bg-${color}`} style={{ boxShadow: `0 0 8px var(--${color === 'cs-red' ? 'red-glow' : color === 'cs-blue' ? 'blue-glow' : color === 'green-signal' ? 'green-signal' : 'amber-warn'})` }} />
              <div><strong className="text-txt-primary">{name}</strong> - {body}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 p-3 rounded-cs-sm border border-cs-border bg-surface-1">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-txt-dim mb-1.5">Try this first</div>
          <code className="text-green-signal font-mono text-[13px]">nmap -sV {firstTargetIp}</code>
        </div>
      </Modal>

      <WorkspaceTopBar
        role="red"
        sessionId={sessionId}
        scenarioId={session.scenario_id}
        methodology={session.methodology}
        phase={phase}
        score={score}
        aiMode={aiMode}
        elapsed={elapsed}
        connection={connectionState}
        completedAt={session?.completed_at}
        flagsCaptured={session?.flags_captured || []}
        totalFlags={session?.total_flags || 0}
        onSubmitFlag={handleFlagSubmit}
      >
        <button
          onClick={() => setShowKillChain(true)}
          className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 bg-surface-3 border border-cs-border hover:bg-surface-4 hover:text-txt-primary text-txt-secondary rounded-cs-sm transition-colors mr-1"
        >
          View Kill Chain
        </button>
        <LayoutPicker role="red" scenarioId={session.scenario_id} />
      </WorkspaceTopBar>

      <Modal
        open={showKillChain}
        onClose={() => setShowKillChain(false)}
        title="Live Attack Timeline"
        size="xl"
      >
        <div className="mt-2">
          <KillChainView sessionId={sessionId} role="red" />
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

      <div ref={containerRef} className="workspace-resizable-red flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden p-3 gap-3 bg-transparent relative z-10">
        {/* LEFT PANE */}
        <div
          className="flex flex-col h-[50vh] md:h-full min-w-0"
          style={{
            flex: typeof window !== 'undefined' && window.innerWidth < 768 ? undefined : `0 1 ${terminalPaneWidth}%`,
            maxWidth: typeof window !== 'undefined' && window.innerWidth < 768 ? undefined : 'calc(100% - 360px)',
          }}
        >
          <div className="flex-1 flex flex-col min-h-0 relative mb-3 workspace-pane pane-hl-red">
            <PanelHeader color="red" title="Kali Terminal" subtitle="attacker workspace">
              {phaseMap[phase] && (
                <span className="siem-mitre font-mono">{phaseMap[phase]}</span>
              )}
              {session.scenario_variant && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-cs-sm border border-amber-warn/30 bg-amber-warn/10 text-amber-warn ml-1">
                  {session.scenario_variant}
                </span>
              )}
              {session.target_ip && (
                <span className="text-[9px] font-mono text-green-signal/80 bg-green-signal/5 border border-green-signal/20 px-1.5 py-0.5 rounded-cs-sm ml-1">
                  {session.target_ip}
                </span>
              )}
            </PanelHeader>
            <div className="flex-1 bg-transparent overflow-hidden flex flex-col relative">
              <ErrorBoundary>
                <Terminal sessionId={sessionId} onData={handleRawInput} onCommand={handleCommand} pendingOutput={writeOutputRef} connectionState={connectionState} />
              </ErrorBoundary>
            </div>
          </div>
          <div className="h-1/3 min-h-[250px] flex flex-col mt-3 relative workspace-pane pane-hl-amber">
            <PanelHeader color="amber" title="Pentest Notebook" subtitle={`Phase ${phase}`}>
              <LearningContextBadge scenario={session.scenario_id} phase={phase} />
            </PanelHeader>
            <div className="flex-1 overflow-hidden flex flex-col">
              <GuidedNotebook sessionId={sessionId} role="red" phase={phase} />
            </div>
          </div>
        </div>

        {/* DRAG DIVIDER */}
        <div
          className="hidden md:block w-1.5 bg-cs-border hover:bg-cs-border-glow cursor-col-resize flex-shrink-0 z-20 transition-all rounded-full h-[98%] my-auto"
          onMouseDown={handleDragStart}
        />

        {/* RIGHT PANE */}
        <div className="flex-1 flex flex-col min-w-0 h-[50vh] md:h-full">

          <div className="flex-1 flex flex-col min-h-0 mb-3 relative workspace-pane pane-hl-blue">
            <PanelHeader color="blue" title="AI Tutor" />
            <div className="flex-1 overflow-hidden flex flex-col">
              <AiHintPanel onSubmitQuestion={sendTutorQuestion} connectionState={connectionState} />
            </div>
          </div>
          <div className={`flex-1 flex flex-col min-h-0 mt-3 relative workspace-pane pane-hl-green transition-all duration-300 ${siemFlash ? 'ring-1 ring-green-signal/40' : ''}`}>
            {siemFlash && (
              <div className="absolute inset-0 bg-green-signal/5 z-20 pointer-events-none animate-pulse" />
            )}
            <PanelHeader color="green" title="SIEM Feed" subtitle={siemFlash ? 'alert triggered' : 'alerts your actions trigger'}>
              <LiveDot />
            </PanelHeader>
            <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
              <ErrorBoundary>
                <SiemFeed />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelHeader({ color, title, subtitle, children }) {
  return (
    <div className="workspace-panel-header relative z-10">
      <span className={`panel-header-dot ${color}`} />
      <span className="workspace-panel-title text-xs font-mono font-semibold uppercase tracking-wider" style={{
        color: color === 'red' ? 'var(--red-primary)' :
               color === 'blue' ? 'var(--blue-primary)' :
               color === 'green' ? 'var(--green-signal)' :
               color === 'amber' ? 'var(--amber-warn)' :
               color === 'purple' ? '#a855f7' : 'var(--text-dim)'
      }}>{title}</span>
      {subtitle && <span className="workspace-panel-subtitle text-xs text-txt-dim font-mono">{subtitle}</span>}
      <div className="ml-auto flex flex-shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

function LiveDot() {
  return (
    <div className="flex items-center gap-1">
      <span className="dot-live" />
      <span className="text-green-signal text-xs font-mono">live</span>
    </div>
  )
}

function LearningContextBadge({ scenario, phase }) {
  const titles = {
    'SC-01': { 1: 'Reconnaissance', 2: 'Enumeration', 3: 'Vulnerability ID', 4: 'Exploitation', 5: 'Post-exploitation', 6: 'Reporting' },
    'SC-02': { 1: 'AD Recon', 2: 'Kerberoasting', 3: 'Lateral Movement', 4: 'DCSync' },
    'SC-03': { 1: 'OSINT', 2: 'Campaign Setup', 3: 'Payload Delivery', 4: 'C2 Execution', 5: 'Reporting' },
  }
  const title = titles[scenario]?.[phase]
  if (!title) return null
  return <span className="text-txt-dim text-xs font-mono">{title}</span>
}
