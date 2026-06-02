import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import ConnectionPill from './ConnectionPill'
import PhaseTrail from '../methodology/PhaseTrail'
import { useSessionStore } from '../../store/sessionStore'
import FlagSubmitWidget from './FlagSubmitWidget'

/**
 * WorkspaceTopBar — refined session header used by both Red and Blue workspaces.
 *
 * Props:
 *   role          'red' | 'blue'
 *   sessionId     string (for end-debrief navigation)
 *   scenarioId    string
 *   methodology   string
 *   phase         number
 *   score         number
 *   aiMode        'learn' | 'challenge'
 *   elapsed       seconds
 *   connection    'connected' | 'connecting' | 'disconnected' | 'unauthorized'
 */

const ROLE_TOKENS = {
  red:  { label: 'Red Team',  tone: 'text-cs-red',  dot: '#ff3b3b' },
  blue: { label: 'Blue Team', tone: 'text-cs-blue', dot: '#3b8bff' },
}

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const r = (s % 60).toString().padStart(2, '0')
  return `${m}:${r}`
}

const scoreTone = (s) => s >= 80 ? 'text-green-signal' : s >= 50 ? 'text-amber-warn' : 'text-cs-red'
const scoreBorder = (s) => s >= 80 ? 'border-green-signal/20' : s >= 50 ? 'border-amber-warn/20' : 'border-cs-red/20'

function useCountUp(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const start = prev.current
    const diff = target - start
    if (diff === 0) return
    const steps = Math.max(10, Math.abs(diff))
    const interval = duration / steps
    let step = 0
    const id = setInterval(() => {
      step++
      setDisplay(Math.round(start + (diff * step) / steps))
      if (step >= steps) { clearInterval(id); prev.current = target }
    }, interval)
    return () => clearInterval(id)
  }, [target, duration])
  return display
}

export default function WorkspaceTopBar({
  role,
  sessionId,
  scenarioId,
  methodology,
  phase,
  score,
  aiMode,
  elapsed,
  connection,
  completedAt,
  flagsCaptured = [],
  totalFlags = 0,
  onSubmitFlag,
  children,
}) {
  const navigate = useNavigate()
  const tokens = ROLE_TOKENS[role] || ROLE_TOKENS.red
  const activeBranch = useSessionStore((state) => state.activeBranch)
  const displayScore = useCountUp(score ?? 100)
  const [ending, setEnding] = useState(false)

  const endMission = async () => {
    if (ending) return
    if (!completedAt && !window.confirm(
      'End this mission? This terminates the sandbox machine(s) and finalizes your report. You can still review the debrief afterwards.'
    )) return
    setEnding(true)
    try {
      // Idempotent on the backend: stops the container + marks the session complete.
      if (!completedAt) await api.post(`/sessions/${sessionId}/end`)
    } catch {
      // Non-fatal: the debrief mount also runs the teardown as a safety net.
    } finally {
      navigate(`/session/${sessionId}/debrief`)
    }
  }

  return (
    <div
      className="
        relative z-50 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-2 w-full
        bg-surface-1/70 border-b border-cs-border
        backdrop-blur-md select-none
      "
      style={{ minHeight: 52 }}
    >
      {/* Back button */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-v3 btn-v3-subtle flex items-center gap-1.5 text-sm"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Missions</span>
        </button>
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="w-2 h-2 rounded-full animate-pulse-soft"
          style={{ background: tokens.dot, boxShadow: `0 0 8px ${tokens.dot}80` }}
        />
        <span className={`font-display text-xs font-semibold ${tokens.tone}`}>
          {tokens.label}
        </span>
      </div>

      <div className="h-4 w-px bg-cs-border" />

      {/* Scenario / Phase badge */}
      {scenarioId && (
        <span className="font-mono text-[11px] text-txt-secondary px-2 py-0.5 rounded-cs-sm bg-surface-2 border border-cs-border flex-shrink-0">
          {scenarioId}{phase && !completedAt ? ` · Phase ${phase}` : ''}
        </span>
      )}

      <div className="h-4 w-px bg-cs-border hidden xl:block" />

      {/* Phase trail (flex grows to fill, hidden on smaller viewports) */}
      <div className="hidden xl:flex flex-1 min-w-0 overflow-x-auto">
        <PhaseTrail methodology={methodology} role={role} currentPhase={phase} activeBranch={activeBranch} />
      </div>

      {/* Right cluster */}
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 ml-auto">

        {children}

        {role === 'red' && (
          <FlagSubmitWidget
            sessionId={sessionId}
            scenarioId={scenarioId}
            onFlagCaptured={async () => {
              if (onSubmitFlag) {
                await onSubmitFlag('')
              }
            }}
            flagsCaptured={flagsCaptured}
            totalFlags={totalFlags}
          />
        )}

        {/* Flag ◆◇ progress indicators */}
        {role === 'red' && totalFlags > 0 && (
          <div className="hidden sm:flex items-center gap-0.5" aria-label={`${flagsCaptured.length} of ${totalFlags} flags captured`}>
            {Array.from({ length: totalFlags }).map((_, i) => (
              <span key={i} className={`text-[10px] transition-colors duration-300 ${i < flagsCaptured.length ? 'text-green-signal' : 'text-txt-dim'}`} aria-hidden>
                {i < flagsCaptured.length ? '◆' : '◇'}
              </span>
            ))}
          </div>
        )}

        <div className="hidden lg:block">
          <ConnectionPill state={connection} />
        </div>

        {aiMode && (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('mission:toggle-ai-mode', {
                detail: { mode: aiMode === 'learn' ? 'challenge' : 'learn' }
              }))
            }}
            className={`hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-display text-xs transition-all hover:brightness-110 active:scale-95 cursor-pointer ${
              aiMode === 'learn'
                ? 'text-cs-blue bg-cs-blue/8 border-cs-blue/30 hover:border-cs-blue/50'
                : 'text-amber-warn bg-amber-warn/8 border-amber-warn/30 hover:border-amber-warn/50'
            }`}
            title="Click to toggle Tutor mode"
          >
            {aiMode === 'learn' ? 'Learn' : 'Challenge'}
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-cs-border bg-surface-2 font-mono text-[11px] text-txt-secondary tabular-nums">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {formatTime(elapsed)}
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-surface-2 font-mono text-[11px] transition-colors duration-500 ${scoreBorder(score)}`}>
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-txt-dim hidden sm:inline">Score</span>
          <span className={`font-bold tabular-nums ${scoreTone(score)}`}>{displayScore}</span>
        </div>

        <button
          onClick={async () => {
            if (window.confirm('Restart the sandbox container? This will wipe the current terminal state and bounce the target network.')) {
              await api.post(`/sessions/${sessionId}/restart-sandbox`)
              window.location.reload()
            }
          }}
          className="btn-v3 btn-v3-sm text-txt-dim hover:text-txt-primary hover:bg-surface-3 transition-colors border-transparent hover:border-cs-border hidden lg:inline-flex"
          style={{ background: 'transparent' }}
          title="Restart Sandbox Container"
        >
          Restart
        </button>

        <button
          onClick={endMission}
          disabled={ending}
          className="btn-v3 btn-v3-subtle btn-v3-sm disabled:opacity-60 disabled:cursor-wait"
          title="End Mission — terminates the sandbox and opens the debrief"
        >
          {ending ? 'Ending…' : completedAt ? 'View Debrief' : 'End Mission'}
        </button>
      </div>
    </div>
  )
}

