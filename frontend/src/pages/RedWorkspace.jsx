import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import RoeBriefing from '../components/workspace/RoeBriefing'
import Terminal from '../components/terminal/Terminal'
import SiemFeed from '../components/siem/SiemFeed'
import GuidedNotebook from '../components/notes/GuidedNotebook'
import AiHintPanel from '../components/hints/AiHintPanel'
import PhaseTrail from '../components/methodology/PhaseTrail'
import api from '../lib/api'

export default function RedWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score, aiMode, siemEvents, setSiemEvents } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const [session, setSession] = useState(currentSession)
  const [roeAcked, setRoeAcked] = useState(currentSession?.roe_acknowledged ?? false)
  const [showWelcome, setShowWelcome] = useState(skillLevel === 'beginner')
  const [elapsed, setElapsed] = useState(0)
  const [siemFlash, setSiemFlash] = useState(false)
  const siemCountRef = useRef(0)
  const writeOutputRef = useRef(null)

  const { sendRawInput, sendCommand, requestHint, toggleMode } = useWebSocket(sessionId)

  useEffect(() => {
    if (!session) {
      api.get(`/sessions/${sessionId}`)
        .then(r => { setSession(r.data); setRoeAcked(r.data.roe_acknowledged) })
        .catch(() => navigate('/dashboard'))
    }
    api.get(`/sessions/${sessionId}/events`).then(r => setSiemEvents(r.data || [])).catch(() => {})
  }, [session, sessionId, navigate, setSiemEvents])

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Causality flash: when new SIEM events arrive, briefly highlight the panel
  useEffect(() => {
    if (siemEvents.length > siemCountRef.current) {
      siemCountRef.current = siemEvents.length
      setSiemFlash(true)
      const t = setTimeout(() => setSiemFlash(false), 2000)
      return () => clearTimeout(t)
    }
  }, [siemEvents.length])

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // Raw keystrokes → Docker PTY
  const handleRawInput = useCallback((data) => { sendRawInput(data) }, [sendRawInput])
  // Complete command → AI/discovery tracking
  const handleCommand = useCallback((cmd) => { sendCommand(cmd) }, [sendCommand])

  if (!session) return <div className="min-h-screen bg-void flex items-center justify-center text-txt-dim text-sm font-mono">Loading session...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  return (
    <div className="h-screen bg-void flex flex-col overflow-hidden font-display">
      {/* Beginner welcome overlay */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-1 border border-cs-border rounded-cs-lg max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-txt-primary mb-3 font-display">Welcome to your workspace</h2>
            <div className="space-y-3 text-sm text-txt-secondary mb-6">
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-cs-red mt-1 flex-shrink-0 shadow-red-glow" />
                <div><strong className="text-txt-primary">Terminal</strong> (left) — Type commands here. This is your Kali Linux terminal where you'll run penetration testing tools.</div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-cs-blue mt-1 flex-shrink-0 shadow-blue-glow" />
                <div><strong className="text-txt-primary">AI Tutor</strong> (top right) — Your mentor. It watches what you do and gives guidance. Toggle between Learn and Challenge modes.</div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-green-signal mt-1 flex-shrink-0" />
                <div><strong className="text-txt-primary">SIEM Feed</strong> (middle right) — See what alerts your actions trigger. This is what the Blue Team sees.</div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-warn mt-1 flex-shrink-0" />
                <div><strong className="text-txt-primary">Notebook</strong> (bottom) — Document your findings. Good documentation is a critical professional skill.</div>
              </div>
            </div>
            <p className="text-xs text-txt-dim mb-4 font-mono">Tip: Start with a port scan. Try typing <code className="text-green-signal bg-surface-3 px-1.5 py-0.5 rounded-cs-sm">nmap -sV {session.scenario_id === 'SC-01' ? '172.20.1.20' : session.scenario_id === 'SC-02' ? '172.20.2.20' : '172.20.3.40'}</code></p>
            <button onClick={() => setShowWelcome(false)} className="w-full btn btn-red justify-center text-sm">
              Start training
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-1/80 border-b border-cs-border flex-shrink-0 backdrop-blur-sm">
        <button onClick={() => navigate('/dashboard')} className="text-txt-dim hover:text-txt-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-cs-red animate-pulse" style={{ boxShadow: '0 0 8px rgba(255,59,59,0.5)' }} />
          <span className="text-cs-red text-xs font-bold tracking-wider font-mono uppercase">RED TEAM</span>
        </div>
        <div className="h-4 w-px bg-cs-border" />
        <span className="text-txt-dim text-xs font-mono">{session.scenario_id}</span>
        <div className="h-4 w-px bg-cs-border" />
        <div className="flex-1 overflow-hidden">
          <PhaseTrail methodology={session.methodology} role="red" currentPhase={phase} />
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-cs-sm font-mono font-medium ${
            aiMode === 'learn' ? 'text-cs-blue bg-cs-blue-dim border border-cs-blue/20' : 'text-amber-warn bg-amber-warn/10 border border-amber-warn/20'
          }`}>{aiMode === 'learn' ? 'Learn' : 'Challenge'}</span>
          <span className="text-xs text-txt-dim font-mono tabular-nums">{formatTime(elapsed)}</span>
          <div className="text-xs text-txt-secondary font-mono">
            Score: <span className={`font-bold ${score >= 80 ? 'text-green-signal' : score >= 50 ? 'text-amber-warn' : 'text-cs-red'}`}>{score}</span>
          </div>
          <button onClick={() => navigate(`/session/${sessionId}/debrief`)}
            className="btn btn-ghost btn-sm text-xs">
            End & debrief
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '1fr 340px', gridTemplateRows: '1fr 1fr 200px' }}>

        {/* Terminal — left, spans 2 rows */}
        <div className="row-span-2 border-r border-cs-border flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-red-surface opacity-50" />
          <PanelHeader color="red" title="Kali Terminal" subtitle="attacker workspace">
            <MitreBadge phase={phase} scenario={session.scenario_id} />
          </PanelHeader>
          <div className="flex-1 overflow-hidden relative z-10">
            <Terminal onData={handleRawInput} onCommand={handleCommand} pendingOutput={writeOutputRef} />
          </div>
        </div>

        {/* AI Tutor — top right */}
        <div className="border-b border-cs-border flex flex-col overflow-hidden">
          <PanelHeader color="blue" title="AI Tutor" />
          <div className="flex-1 overflow-hidden">
            <AiHintPanel onRequestHint={requestHint} onToggleMode={toggleMode} />
          </div>
        </div>

        {/* SIEM Peek — middle right */}
        <div className={`border-b border-cs-border flex flex-col overflow-hidden relative transition-all duration-300 ${siemFlash ? 'ring-1 ring-green-signal/40' : ''}`}>
          <div className="absolute inset-0 bg-blue-surface opacity-30" />
          {siemFlash && (
            <div className="absolute inset-0 bg-green-signal/5 z-20 pointer-events-none animate-pulse" />
          )}
          <PanelHeader color="green" title="SIEM Feed" subtitle={siemFlash ? 'alert triggered' : 'alerts your actions trigger'}>
            <LiveDot />
          </PanelHeader>
          <div className="flex-1 overflow-hidden relative z-10">
            <SiemFeed />
          </div>
        </div>

        {/* Notebook — bottom, full width */}
        <div className="col-span-2 border-t border-cs-border flex flex-col overflow-hidden">
          <PanelHeader color="amber" title="Pentest Notebook" subtitle={`Phase ${phase}`}>
            <LearningContextBadge scenario={session.scenario_id} phase={phase} />
          </PanelHeader>
          <div className="flex-1 overflow-hidden">
            <GuidedNotebook sessionId={sessionId} role="red" phase={phase} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelHeader({ color, title, subtitle, children }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2/50 border-b border-cs-border/30 flex-shrink-0 relative z-10">
      <span className={`panel-header-dot ${color}`} />
      <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{
        color: color === 'red' ? 'var(--red-primary)' :
               color === 'blue' ? 'var(--blue-primary)' :
               color === 'green' ? 'var(--green-signal)' :
               color === 'amber' ? 'var(--amber-warn)' :
               color === 'purple' ? '#a855f7' : 'var(--text-dim)'
      }}>{title}</span>
      {subtitle && <span className="text-xs text-txt-dim font-mono">{subtitle}</span>}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

function MitreBadge({ phase, scenario }) {
  const mitre = {
    'SC-01': { 1: 'T1590', 2: 'T1595', 3: 'T1190', 4: 'T1552', 5: 'T1005', 6: null },
    'SC-02': { 1: 'T1087', 2: 'T1558', 3: 'T1021', 4: 'T1003' },
    'SC-03': { 1: 'T1598', 2: 'T1566', 3: 'T1204', 4: 'T1071', 5: null },
  }
  const tid = mitre[scenario]?.[phase]
  if (!tid) return null
  return <span className="siem-mitre font-mono">{tid}</span>
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
