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
  const { currentSession, phase, score, aiMode } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const [session, setSession] = useState(currentSession)
  const [roeAcked, setRoeAcked] = useState(currentSession?.roe_acknowledged ?? false)
  const [showWelcome, setShowWelcome] = useState(skillLevel === 'beginner')
  const [elapsed, setElapsed] = useState(0)
  const writeOutputRef = useRef(null)

  const { sendRawInput, sendCommand, requestHint, toggleMode } = useWebSocket(sessionId)

  useEffect(() => {
    if (!session) {
      api.get(`/sessions/${sessionId}`)
        .then(r => { setSession(r.data); setRoeAcked(r.data.roe_acknowledged) })
        .catch(() => navigate('/'))
    }
  }, [session, sessionId, navigate])

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // Raw keystrokes → Docker PTY
  const handleRawInput = useCallback((data) => { sendRawInput(data) }, [sendRawInput])
  // Complete command → AI/discovery tracking
  const handleCommand = useCallback((cmd) => { sendCommand(cmd) }, [sendCommand])

  if (!session) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Loading session...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Beginner welcome overlay */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-3">Welcome to your workspace</h2>
            <div className="space-y-3 text-sm text-slate-300 mb-6">
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                <div><strong className="text-white">Terminal</strong> (left) — Type commands here. This is your Kali Linux terminal where you'll run penetration testing tools.</div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-500 mt-1 flex-shrink-0" />
                <div><strong className="text-white">AI Tutor</strong> (top right) — Your mentor. It watches what you do and gives guidance. Toggle between Learn and Challenge modes.</div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-500 mt-1 flex-shrink-0" />
                <div><strong className="text-white">SIEM Feed</strong> (middle right) — See what alerts your actions trigger. This is what the Blue Team sees.</div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                <div><strong className="text-white">Notebook</strong> (bottom) — Document your findings. Good documentation is a critical professional skill.</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">Tip: Start with a port scan to discover what's running on the target. Try typing <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">nmap -sV {session.scenario_id === 'SC-01' ? '172.20.1.20' : session.scenario_id === 'SC-02' ? '172.20.2.20' : '172.20.3.40'}</code></p>
            <button onClick={() => setShowWelcome(false)}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm">
              Start training
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 border-b border-slate-800/50 flex-shrink-0 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="text-slate-600 hover:text-slate-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-rose-400 text-xs font-bold tracking-wide">RED TEAM</span>
        </div>
        <div className="h-4 w-px bg-slate-800" />
        <span className="text-slate-500 text-xs font-mono">{session.scenario_id}</span>
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex-1 overflow-hidden">
          <PhaseTrail methodology={session.methodology} role="red" currentPhase={phase} />
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-md ${
            aiMode === 'learn' ? 'text-cyan-400 bg-cyan-950/30 border border-cyan-800/30' : 'text-amber-400 bg-amber-950/30 border border-amber-800/30'
          }`}>{aiMode === 'learn' ? 'Learn' : 'Challenge'}</span>
          <span className="text-xs text-slate-500 font-mono">{formatTime(elapsed)}</span>
          <div className="text-xs text-slate-400">
            Score: <span className={`font-bold ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{score}</span>
          </div>
          <button onClick={() => navigate(`/session/${sessionId}/debrief`)}
            className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 rounded-lg transition-all">
            End & debrief
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '1fr 340px', gridTemplateRows: '1fr 1fr 200px' }}>

        {/* Terminal — left, spans 2 rows */}
        <div className="row-span-2 border-r border-slate-800/50 flex flex-col overflow-hidden">
          <PanelHeader color="rose" title="Kali Terminal" subtitle="attacker workspace">
            <MitreBadge phase={phase} scenario={session.scenario_id} />
          </PanelHeader>
          <div className="flex-1 overflow-hidden">
            <Terminal onData={handleRawInput} onCommand={handleCommand} pendingOutput={writeOutputRef} />
          </div>
        </div>

        {/* AI Tutor — top right */}
        <div className="border-b border-slate-800/50 flex flex-col overflow-hidden">
          <PanelHeader color="cyan" title="AI Tutor" />
          <div className="flex-1 overflow-hidden">
            <AiHintPanel onRequestHint={requestHint} onToggleMode={toggleMode} />
          </div>
        </div>

        {/* SIEM Peek — middle right */}
        <div className="border-b border-slate-800/50 flex flex-col overflow-hidden">
          <PanelHeader color="teal" title="SIEM Feed" subtitle="alerts your actions trigger">
            <LiveDot />
          </PanelHeader>
          <div className="flex-1 overflow-hidden">
            <SiemFeed />
          </div>
        </div>

        {/* Notebook — bottom, full width */}
        <div className="col-span-2 border-t border-slate-800/50 flex flex-col overflow-hidden">
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
  const colors = {
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
    teal: 'bg-teal-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/30 flex-shrink-0">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[color] || colors.cyan}`} />
      <span className="text-xs text-slate-300 font-medium">{title}</span>
      {subtitle && <span className="text-xs text-slate-600">{subtitle}</span>}
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
  return <span className="text-purple-400 bg-purple-950/30 border border-purple-800/30 text-xs px-1.5 py-0.5 rounded font-mono">{tid}</span>
}

function LiveDot() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-emerald-500 text-xs">live</span>
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
  return <span className="text-slate-500 text-xs">{title}</span>
}
