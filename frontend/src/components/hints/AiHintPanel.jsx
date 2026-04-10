import { useState, useEffect } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { useAuthStore } from '../../store/authStore'

export default function AiHintPanel({ onRequestHint, onToggleMode }) {
  const [hints, setHints] = useState([])
  const [loading, setLoading] = useState(false)
  const { aiMode } = useSessionStore()
  const { skillLevel } = useAuthStore()

  const hintPenalties = skillLevel === 'beginner' ? [2, 5, 10] :
                         skillLevel === 'experienced' ? [10, 20, 40] : [5, 10, 20]

  useEffect(() => {
    const handler = (evt) => {
      setHints((p) => [{
        text: evt.detail.text,
        steps: evt.detail.steps || null,
        level: evt.detail.level || null,
        ts: new Date().toLocaleTimeString(),
      }, ...p].slice(0, 30))
      setLoading(false)
    }
    window.addEventListener('ai:hint', handler)
    return () => window.removeEventListener('ai:hint', handler)
  }, [])

  const request = (level) => {
    setLoading(true)
    onRequestHint(level)
    setTimeout(() => {
      setLoading((current) => {
        if (current) {
          setHints((p) => [{
            text: 'Hint service is taking longer than expected. Try again in a moment.',
            level: null, ts: new Date().toLocaleTimeString(), isError: true,
          }, ...p].slice(0, 30))
        }
        return false
      })
    }, 15000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-500 font-medium">AI Mode:</span>
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5">
            {['learn', 'challenge'].map(m => (
              <button key={m} onClick={() => onToggleMode?.(m)}
                className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${
                  aiMode === m
                    ? m === 'learn'
                      ? 'bg-cyan-600/20 text-cyan-400 shadow-sm'
                      : 'bg-amber-600/20 text-amber-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                {m === 'learn' ? 'Learn' : 'Challenge'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600">
          {aiMode === 'learn'
            ? 'Step-by-step guidance with concept explanations'
            : 'Socratic questioning — hints guide, but never give direct answers'}
        </p>
      </div>

      {/* Hints list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {hints.length === 0 && !loading && (
          <div className="space-y-3">
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/30">
              <p className="text-slate-400 text-xs leading-relaxed mb-3">
                {aiMode === 'learn'
                  ? 'Your AI tutor watches your actions and provides detailed explanations. Ask for hints at any time — the tutor adapts to your skill level.'
                  : 'The AI monitor observes your actions and provides Socratic guidance to help you think through problems independently.'}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="text-amber-400 font-medium">L1 Conceptual</span>
                  <span className="text-slate-600">— What concept applies here?</span>
                  <span className="ml-auto text-slate-700">-{hintPenalties[0]} pts</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                  <span className="text-orange-400 font-medium">L2 Directional</span>
                  <span className="text-slate-600">— Which tool and approach?</span>
                  <span className="ml-auto text-slate-700">-{hintPenalties[1]} pts</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                  <span className="text-rose-400 font-medium">L3 Procedural</span>
                  <span className="text-slate-600">— Step-by-step walkthrough</span>
                  <span className="ml-auto text-slate-700">-{hintPenalties[2]} pts</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 border border-slate-800 rounded-lg p-3 bg-slate-900/30">
            <div className="w-3 h-3 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
            Thinking...
          </div>
        )}
        {hints.map((h, i) => (
          <HintCard key={i} hint={h} />
        ))}
      </div>

      {/* Request buttons */}
      <div className="border-t border-slate-800 p-2.5">
        <div className="flex gap-1.5">
          {[
            { level: 1, label: 'L1', penalty: hintPenalties[0], color: 'text-amber-400 border-amber-800/50 hover:bg-amber-950/30' },
            { level: 2, label: 'L2', penalty: hintPenalties[1], color: 'text-orange-400 border-orange-800/50 hover:bg-orange-950/30' },
            { level: 3, label: 'L3', penalty: hintPenalties[2], color: 'text-rose-400 border-rose-800/50 hover:bg-rose-950/30' },
          ].map(({ level, label, penalty, color }) => (
            <button key={level} onClick={() => request(level)} disabled={loading}
              className={`flex-1 py-2 rounded-lg border text-xs transition-all disabled:opacity-50 ${color}`}>
              <div className="font-semibold">{label}</div>
              <div className="text-slate-600 mt-0.5" style={{ fontSize: '10px' }}>-{penalty} pts</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HintCard({ hint }) {
  const levelColor = { 1: 'border-amber-800/30 bg-amber-950/10', 2: 'border-orange-800/30 bg-orange-950/10', 3: 'border-rose-800/30 bg-rose-950/10' }
  const levelLabel = { 1: 'Conceptual', 2: 'Directional', 3: 'Procedural' }
  const style = hint.isError ? 'border-slate-800 bg-slate-900/30' : (hint.level ? levelColor[hint.level] : 'border-cyan-800/30 bg-cyan-950/10')
  const hasSteps = hint.steps && hint.steps.length > 1

  return (
    <div className={`border ${style} rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-2">
        {hint.level ? (
          <span className="text-xs font-medium text-slate-400">L{hint.level} {levelLabel[hint.level]}</span>
        ) : hint.isError ? (
          <span className="text-xs text-slate-500">System</span>
        ) : (
          <span className="text-xs text-cyan-400 font-medium">AI Tutor</span>
        )}
        {hasSteps && <span className="text-xs text-slate-600">{hint.steps.length} steps</span>}
        <span className="text-xs text-slate-700 ml-auto">{hint.ts}</span>
      </div>
      {hasSteps ? (
        <div className="space-y-2">
          {hint.steps.map((step, i) => {
            // Strip "Step N: " prefix if present
            const text = step.replace(/^Step \d+:\s*/i, '')
            return (
              <div key={i} className="flex gap-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <span className="text-xs text-slate-400 font-bold">{i + 1}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed flex-1">{text}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{hint.text}</p>
      )}
    </div>
  )
}
