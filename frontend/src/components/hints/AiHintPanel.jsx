import { useState, useEffect } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { useAuthStore } from '../../store/authStore'

const PHASE_CONTEXT = {
  red: {
    1: { title: 'Reconnaissance', prompt: 'Map the target first. What ports are open? What services and versions are running? What tech stack can you identify?' },
    2: { title: 'Enumeration', prompt: 'You know what is there - now dig deeper. Look for hidden paths, user accounts, version strings, and exposed configuration.' },
    3: { title: 'Vulnerability ID', prompt: 'Map findings to known vulnerabilities. Check CVEs, test inputs for injection, look for authentication bypass opportunities.' },
    4: { title: 'Exploitation', prompt: 'Execute controlled exploitation. Document exactly what you do and the response. Precision matters - this is your evidence.' },
    5: { title: 'Post-Exploitation', prompt: 'Demonstrate impact: what data can you access? Can you escalate privileges? Document persistence mechanisms an attacker would use.' },
    6: { title: 'Reporting', prompt: 'Compile your findings into a professional report: executive summary, technical findings, evidence, and remediation recommendations.' },
  },
  blue: {
    1: { title: 'Identify', prompt: 'An incident is unfolding. Correlate source IPs across SIEM events. Build your initial picture of scope and timeline.' },
    2: { title: 'Detect and Analyze', prompt: 'Confirm this is real, not a false positive. Build the attack timeline. What MITRE technique is being used?' },
    3: { title: 'Contain', prompt: 'Stop the attack without destroying evidence. Isolate hosts, block IPs. Preserve your forensic chain of custody.' },
    4: { title: 'Eradicate', prompt: 'Hunt for persistence: registry keys, scheduled tasks, backdoor accounts, webshells. Remove attacker presence completely.' },
    5: { title: 'Recover', prompt: 'Restore from known-good state. Verify integrity. Set up enhanced monitoring to detect reinfection attempts.' },
    6: { title: 'Post-Incident', prompt: 'Write your IR report: full timeline, IOC list, root cause analysis, and hardening recommendations. This is your deliverable.' },
  },
}

export default function AiHintPanel({ onRequestHint, onToggleMode }) {
  const [hints, setHints] = useState([])
  const [loading, setLoading] = useState(false)
  const { aiMode, phase, currentSession } = useSessionStore()
  const { skillLevel } = useAuthStore()

  const role = currentSession?.role || 'red'
  const scenarioId = currentSession?.scenario_id

  const hintPenalties = skillLevel === 'beginner' ? [2, 5, 10]
    : skillLevel === 'experienced' ? [10, 20, 40]
    : [5, 10, 20]

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

  const ctx = PHASE_CONTEXT[role]?.[phase] || PHASE_CONTEXT.red[1]

  return (
    <div className="flex flex-col h-full bg-void">
      <div className="px-3 pt-3 pb-2.5 border-b border-cs-border">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-xs text-txt-dim font-mono">Mode:</span>
          <div className="flex gap-1 bg-surface-2 rounded-cs-sm p-0.5">
            {['learn', 'challenge'].map((m) => (
              <button key={m} onClick={() => onToggleMode?.(m)}
                className={`text-xs px-3 py-1 rounded-cs-sm transition-all font-mono font-medium ${
                  aiMode === m
                    ? m === 'learn'
                      ? 'bg-cs-blue/15 text-cs-blue border border-cs-blue/20'
                      : 'bg-amber-warn/15 text-amber-warn border border-amber-warn/20'
                    : 'text-txt-dim hover:text-txt-secondary'
                }`}>
                {m === 'learn' ? 'Learn' : 'Challenge'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-txt-dim font-mono leading-relaxed">
          {aiMode === 'learn'
            ? 'Step-by-step guidance with concept explanations.'
            : 'Socratic questioning — you think it through, the tutor guides.'}
        </p>
      </div>

      <div className="mx-3 mt-2.5 px-3 py-2.5 rounded-cs border border-cs-border bg-surface-2/60">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${role === 'red' ? 'bg-cs-red' : 'bg-cs-blue'}`} />
          <span className={`text-xs font-mono font-semibold ${role === 'red' ? 'text-cs-red' : 'text-cs-blue'}`}>
            Phase {phase}: {ctx.title}
          </span>
          {scenarioId && <span className="text-xs text-txt-dim font-mono ml-auto">{scenarioId}</span>}
        </div>
        <p className="text-xs text-txt-secondary leading-relaxed">{ctx.prompt}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 mt-1">
        {hints.length === 0 && !loading && (
          <div className="border border-cs-border rounded-cs p-3 bg-surface-1/50">
            <p className="text-txt-secondary text-xs leading-relaxed mb-3">
              {aiMode === 'learn'
                ? 'Your AI tutor watches your actions and provides detailed explanations tailored to your current phase and skill level.'
                : 'The AI monitor observes your actions and asks Socratic questions to help you think through problems independently.'}
            </p>
            <div className="space-y-2">
              {[
                { level: 1, label: 'L1 Conceptual', desc: 'What concept applies here?', color: 'text-amber-warn' },
                { level: 2, label: 'L2 Directional', desc: 'Which tool and approach?', color: 'text-orange-400' },
                { level: 3, label: 'L3 Procedural', desc: 'Step-by-step walkthrough', color: 'text-cs-red' },
              ].map(({ level, label, desc, color }) => (
                <div key={level} className="flex items-center gap-2 text-xs">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 bg-surface-3 ${color}`}>{level}</span>
                  <span className={`font-medium ${color}`}>{label}</span>
                  <span className="text-txt-dim">— {desc}</span>
                  <span className="ml-auto text-txt-dim font-mono">-{hintPenalties[level - 1]}pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-txt-secondary border border-cs-border rounded-cs p-3 bg-surface-1/50">
            <div className="w-3 h-3 border-2 border-cs-border border-t-cs-blue rounded-full animate-spin flex-shrink-0" />
            <span className="font-mono">Thinking...</span>
          </div>
        )}
        {hints.map((h, i) => <HintCard key={i} hint={h} />)}
      </div>

      <div className="border-t border-cs-border p-2.5">
        <div className="flex gap-1.5">
          {[
            { level: 1, label: 'L1', desc: 'Conceptual', penalty: hintPenalties[0], cls: 'text-amber-warn border-amber-warn/30 hover:bg-amber-warn/10 hover:border-amber-warn/50' },
            { level: 2, label: 'L2', desc: 'Directional', penalty: hintPenalties[1], cls: 'text-orange-400 border-orange-400/30 hover:bg-orange-400/10 hover:border-orange-400/50' },
            { level: 3, label: 'L3', desc: 'Procedural', penalty: hintPenalties[2], cls: 'text-cs-red border-cs-red/30 hover:bg-cs-red/10 hover:border-cs-red/50' },
          ].map(({ level, label, desc, penalty, cls }) => (
            <button key={level} onClick={() => request(level)} disabled={loading}
              className={`flex-1 py-2 rounded-cs border text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}>
              <div className="font-bold font-mono">{label}</div>
              <div className="text-txt-dim mt-0.5 font-mono text-[10px]">{desc} · -{penalty}pts</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HintCard({ hint }) {
  const levelStyle = {
    1: { border: 'border-amber-warn/25', bg: 'bg-amber-warn/5', label: 'Conceptual', color: 'text-amber-warn' },
    2: { border: 'border-orange-400/25', bg: 'bg-orange-400/5', label: 'Directional', color: 'text-orange-400' },
    3: { border: 'border-cs-red/25', bg: 'bg-cs-red/5', label: 'Procedural', color: 'text-cs-red' },
  }
  const style = hint.isError
    ? { border: 'border-cs-border', bg: 'bg-surface-2/50', label: 'System', color: 'text-txt-dim' }
    : (hint.level ? levelStyle[hint.level] : { border: 'border-cs-blue/25', bg: 'bg-cs-blue/5', label: 'AI Tutor', color: 'text-cs-blue' })

  const hasSteps = hint.steps && hint.steps.length > 1

  return (
    <div className={`border ${style.border} ${style.bg} rounded-cs p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-mono font-semibold ${style.color}`}>
          {hint.level ? `L${hint.level} ${style.label}` : style.label}
        </span>
        {hasSteps && <span className="text-xs text-txt-dim font-mono">{hint.steps.length} steps</span>}
        <span className="text-xs text-txt-dim font-mono ml-auto">{hint.ts}</span>
      </div>
      {hasSteps ? (
        <div className="space-y-2">
          {hint.steps.map((step, i) => {
            const text = step.replace(/^Step \d+:\s*/i, '')
            return (
              <div key={i} className="flex gap-2">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center ${style.border} ${style.bg}`}>
                  <span className={`text-xs font-bold ${style.color}`}>{i + 1}</span>
                </div>
                <p className="text-xs text-txt-primary leading-relaxed flex-1">{text}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-txt-primary leading-relaxed whitespace-pre-wrap">{hint.text}</p>
      )}
    </div>
  )
}
