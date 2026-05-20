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
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import ScoreToast from '../components/ui/ScoreToast'
import api from '../lib/api'

export default function RedWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score, aiMode, siemEvents, setSiemEvents, setCurrentSession } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const cachedSession = currentSession?.id === sessionId ? currentSession : null
  const [session, setSession] = useState(cachedSession)
  const [loadingSession, setLoadingSession] = useState(!cachedSession)
  const [roeAcked, setRoeAcked] = useState(cachedSession?.roe_acknowledged ?? false)
  const [showWelcome, setShowWelcome] = useState(skillLevel === 'beginner')
  const [elapsed, setElapsed] = useState(0)
  const [siemFlash, setSiemFlash] = useState(false)
  const [toast, setToast] = useState(null)
  const [terminalWidth, setTerminalWidth] = useState(65)
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

  const handleDragStart = useCallback((e) => {
    e.preventDefault()
    const handleDrag = (moveEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100
      if (newWidth > 20 && newWidth < 80) setTerminalWidth(newWidth)
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const wsSessionId = session && roeAcked ? sessionId : null
  const { sendRawInput, sendCommand, requestHint, toggleMode, connectionState } = useWebSocket(wsSessionId)

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

  if (loadingSession || !session) return <div className="min-h-screen bg-void flex items-center justify-center text-txt-dim text-sm font-mono">Loading session...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  const firstTargetIp = session.scenario_id === 'SC-01' ? '172.20.1.20' : session.scenario_id === 'SC-02' ? '172.20.2.20' : '172.20.3.40'

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
        onClose={() => setShowWelcome(false)}
        title="Welcome to your Red Team workspace"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="red" onClick={() => setShowWelcome(false)}>Start training</Button>
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
      >
        <LayoutPicker role="red" scenarioId={session.scenario_id} />
      </WorkspaceTopBar>

      {connectionState === 'failed' && (
        <div className="sticky top-14 z-50 flex items-center gap-3 bg-cs-red/10 border-b border-cs-red/40 px-5 py-2.5">
          <span className="h-2 w-2 rounded-full bg-cs-red shrink-0" />
          <p className="text-xs font-mono text-cs-red">
            Connection lost. Please refresh the page or contact your instructor.
          </p>
        </div>
      )}

      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANE */}
        <div 
          className="flex flex-col flex-shrink-0 h-[50vh] md:h-full min-w-0" 
          style={{ flexBasis: typeof window !== 'undefined' && window.innerWidth < 768 ? 'auto' : `${terminalWidth}%` }}
        >
          <div className="flex-1 flex flex-col min-h-0 relative mb-1 md:mb-0">
            <div className="absolute inset-0 bg-red-surface opacity-50 pointer-events-none" />
            <PanelHeader color="red" title="Kali Terminal" subtitle="attacker workspace">
              {phaseMap[phase] && (
                <span className="siem-mitre font-mono">{phaseMap[phase]}</span>
              )}
            </PanelHeader>
            <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
              <Terminal sessionId={sessionId} onData={handleRawInput} onCommand={handleCommand} pendingOutput={writeOutputRef} connectionState={connectionState} />
            </div>
          </div>
          <div className="h-1/3 min-h-[250px] flex flex-col mt-1 md:mt-0 relative border-t border-cs-border bg-surface-1">
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
          className="hidden md:block w-1 bg-surface-3 hover:bg-cs-red cursor-col-resize flex-shrink-0 z-20 transition-colors"
          onMouseDown={handleDragStart}
        />

        {/* RIGHT PANE */}
        <div className="flex-1 flex flex-col min-w-0 h-[50vh] md:h-full">
          <div className="flex-1 flex flex-col min-h-0 mb-1 md:mb-0 relative border-l border-cs-border bg-surface-1">
            <PanelHeader color="blue" title="AI Tutor" />
            <div className="flex-1 overflow-hidden flex flex-col">
              <AiHintPanel onRequestHint={requestHint} onToggleMode={toggleMode} />
            </div>
          </div>
          <div className={`flex-1 flex flex-col min-h-0 mt-1 md:mt-0 relative border-l border-t border-cs-border bg-surface-1 transition-all duration-300 ${siemFlash ? 'ring-1 ring-green-signal/40' : ''}`}>
            <div className="absolute inset-0 bg-blue-surface opacity-30 pointer-events-none" />
            {siemFlash && (
              <div className="absolute inset-0 bg-green-signal/5 z-20 pointer-events-none animate-pulse" />
            )}
            <PanelHeader color="green" title="SIEM Feed" subtitle={siemFlash ? 'alert triggered' : 'alerts your actions trigger'}>
              <LiveDot />
            </PanelHeader>
            <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
              <SiemFeed />
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
