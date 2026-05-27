import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import ConnectionPill from './ConnectionPill'
import PhaseTrail from '../methodology/PhaseTrail'
import { useSessionStore } from '../../store/sessionStore'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

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
  completedAt,
  flagsCaptured = [],
  totalFlags = 0,
  onSubmitFlag,
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-v3 btn-v3-subtle flex items-center gap-1.5 text-sm"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Missions</span>
        </button>
        {phase && !completedAt && (
          <span className="hidden md:inline font-mono text-[11px] text-txt-dim bg-surface-2 border border-cs-border px-2 py-0.5 rounded-cs-sm">
            {scenarioId} · Phase {phase} · In progress
          </span>
        )}
      </div>

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

        {role === 'red' && (
          <SubmitFlagWidget
            flagsCaptured={flagsCaptured}
            totalFlags={totalFlags}
            onSubmitFlag={onSubmitFlag}
          />
        )}

        <ConnectionPill state={connection} />

        {aiMode && (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('mission:toggle-ai-mode', {
                detail: { mode: aiMode === 'learn' ? 'challenge' : 'learn' }
              }))
            }}
            className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[10.5px] uppercase tracking-[0.1em] transition-all hover:brightness-110 active:scale-95 cursor-pointer ${
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

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-cs-border bg-surface-2 font-mono text-[11px]">
          <span className="text-txt-dim uppercase tracking-wider text-[9.5px]">Score</span>
          <span className={`font-bold tabular-nums ${scoreTone(score)}`}>{score}</span>
        </div>

        <button
          onClick={async () => {
            if (window.confirm('Restart the sandbox container? This will wipe the current terminal state and bounce the target network.')) {
              await api.post(`/sessions/${sessionId}/restart-sandbox`)
              window.location.reload()
            }
          }}
          className="btn-v3 btn-v3-sm text-txt-dim hover:text-txt-primary hover:bg-surface-3 transition-colors border-transparent hover:border-cs-border"
          style={{ background: 'transparent' }}
        >
          Restart sandbox
        </button>

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

function SubmitFlagWidget({ flagsCaptured, totalFlags, onSubmitFlag }) {
  const [showModal, setShowModal] = useState(false)
  const [flagValue, setFlagValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = flagValue.trim()
    if (!val) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await onSubmitFlag(val)
      if (res.valid) {
        if (res.already_captured) {
          setError('This flag was already captured!')
        } else {
          setSuccess(`Flag captured successfully! +${res.points_awarded || 0} points.`)
          setFlagValue('')
          setTimeout(() => {
            setShowModal(false)
            setSuccess(null)
          }, 2000)
        }
      } else {
        setError(res.hint || 'Incorrect flag value. Try again!')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to validate flag')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setShowModal(true)
          setError(null)
          setSuccess(null)
          setFlagValue('')
        }}
        className="btn-v3 btn-v3-sm font-mono text-[11px] bg-surface-3 border border-cs-border hover:bg-surface-4 text-txt-secondary hover:text-txt-primary flex items-center gap-2"
      >
        <span>SUBMIT FLAG</span>
        <span className="text-[10px] text-txt-dim bg-surface-2 px-1.5 py-0.5 rounded-cs-sm border border-cs-border">
          {flagsCaptured.length}/{totalFlags} captured
        </span>
      </button>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Submit Mission Flag"
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4 font-display">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-txt-dim mb-1.5">
              Flag Value
            </label>
            <input
              type="text"
              value={flagValue}
              onChange={(e) => setFlagValue(e.target.value)}
              disabled={loading || success}
              placeholder="e.g. FLAG-SC01-1"
              className="w-full bg-surface-3 border border-cs-border rounded-cs px-3 py-2 text-xs text-txt-primary placeholder:text-txt-dim focus:outline-none focus:border-cs-blue transition-colors disabled:opacity-40"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-cs border border-critical/30 bg-critical/5 text-xs text-critical leading-relaxed font-mono">
              <span className="font-bold">❌ Error:</span> {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-cs border border-green-signal/30 bg-green-signal/5 text-xs text-green-signal leading-relaxed font-mono">
              <span className="font-bold">✓ Success:</span> {success}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-cs-border">
            <Button
              variant="ghost"
              onClick={() => setShowModal(false)}
              disabled={loading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="blue"
              type="submit"
              loading={loading}
              disabled={!flagValue.trim() || success}
            >
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
