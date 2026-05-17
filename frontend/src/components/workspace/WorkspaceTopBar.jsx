import { useNavigate } from 'react-router-dom'
import ConnectionPill from './ConnectionPill'
import PhaseTrail from '../methodology/PhaseTrail'
import { useSessionStore } from '../../store/sessionStore'

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
  children,
}) {
  const navigate = useNavigate()
  const tokens = ROLE_TOKENS[role] || ROLE_TOKENS.red
  const activeBranch = useSessionStore((state) => state.activeBranch)

  return (
    <div
      className="
        relative flex items-center gap-3 px-4 py-2.5
        bg-surface-1/70 border-b border-cs-border
        backdrop-blur-md
      "
      style={{ minHeight: 52 }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        aria-label="Back to dashboard"
        className="
          flex items-center justify-center w-7 h-7 rounded-cs-sm
          text-txt-dim hover:text-txt-primary
          hover:bg-surface-3 transition-colors duration-enter
        "
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Role badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="w-2 h-2 rounded-full animate-pulse-soft"
          style={{ background: tokens.dot, boxShadow: `0 0 8px ${tokens.dot}80` }}
        />
        <span className={`font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${tokens.tone}`}>
          {tokens.label}
        </span>
      </div>

      <div className="h-4 w-px bg-cs-border" />

      {/* Scenario chip */}
      <span className="font-mono text-[11px] text-txt-secondary px-2 py-0.5 rounded-cs-sm bg-surface-2 border border-cs-border">
        {scenarioId}
      </span>

      <div className="h-4 w-px bg-cs-border hidden md:block" />

      {/* Phase trail (flex grows to fill) */}
      <div className="hidden md:flex flex-1 min-w-0 overflow-x-auto">
        <PhaseTrail methodology={methodology} role={role} currentPhase={phase} activeBranch={activeBranch} />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 ml-auto flex-shrink-0">
        {children}
        <ConnectionPill state={connection} />

        {aiMode && (
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[10.5px] uppercase tracking-[0.1em] ${
              aiMode === 'learn'
                ? 'text-cs-blue bg-cs-blue/8 border-cs-blue/30'
                : 'text-amber-warn bg-amber-warn/8 border-amber-warn/30'
            }`}
          >
            {aiMode === 'learn' ? 'Learn' : 'Challenge'}
          </span>
        )}

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-cs-border bg-surface-2 font-mono text-[11px] text-txt-secondary tabular-nums">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {formatTime(elapsed)}
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-cs-border bg-surface-2 font-mono text-[11px]">
          <span className="text-txt-dim uppercase tracking-wider text-[9.5px]">Score</span>
          <span className={`font-bold tabular-nums ${scoreTone(score)}`}>{score}</span>
        </div>

        <button
          onClick={() => navigate(`/session/${sessionId}/debrief`)}
          className="btn-v3 btn-v3-subtle btn-v3-sm"
        >
          End & debrief
        </button>
      </div>
    </div>
  )
}
