import { useState, useEffect, useRef } from 'react'
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

const parseAIHint = (text) => {
  if (!text) return null

  const tags = [
    { key: 'Concept', label: 'Concept', color: 'border-cs-blue/30 text-cs-blue bg-cs-blue/5' },
    { key: 'What to do', label: 'What to Do', color: 'border-green-signal/30 text-green-signal bg-green-signal/5' },
    { key: 'What to look for', label: 'What to Look For', color: 'border-amber-warn/30 text-amber-warn bg-amber-warn/5' },
    { key: 'Pro tip', label: 'Pro Tip', color: 'border-magenta/30 text-magenta bg-magenta/5' }
  ]

  const markers = []
  tags.forEach(tag => {
    const idx = text.indexOf(`[${tag.key}]`)
    if (idx !== -1) {
      markers.push({ ...tag, index: idx })
    }
  })

  markers.sort((a, b) => a.index - b.index)

  if (markers.length > 0) {
    const sections = []
    const firstIdx = markers[0].index
    if (firstIdx > 0) {
      const intro = text.substring(0, firstIdx).trim()
      if (intro) {
        sections.push({ type: 'general', content: intro })
      }
    }

    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index + `[${markers[i].key}]`.length
      const end = (i + 1 < markers.length) ? markers[i + 1].index : text.length
      const content = text.substring(start, end).trim()
      sections.push({
        type: markers[i].key,
        label: markers[i].label,
        color: markers[i].color,
        content
      })
    }
    return { format: 'tagged', sections }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const stepRegex = /^(?:Step\s+\d+:|\d+\.|\*|-)\s*(.*)/i
  const stepLines = lines.filter(l => stepRegex.test(l))

  if (stepLines.length > 0 && stepLines.length >= lines.length / 2) {
    const steps = lines.map((line, idx) => {
      const match = line.match(stepRegex)
      return {
        index: idx + 1,
        content: match ? match[1].trim() : line
      }
    })
    return { format: 'steps', steps }
  }

  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(Boolean)
  return { format: 'general', paragraphs }
}

export default function AiHintPanel({ onRequestHint, onToggleMode }) {
  const [hints, setHints] = useState([])
  const [loading, setLoading] = useState(false)
  const { aiMode, phase, currentSession, activeBranch } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const messagesEndRef = useRef(null)

  const role = currentSession?.role || 'red'
  const scenarioId = currentSession?.scenario_id

  const hintPenalties = skillLevel === 'beginner' ? [2, 5, 10]
    : skillLevel === 'experienced' ? [10, 20, 40]
    : [5, 10, 20]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [hints])

  useEffect(() => {
    const handler = (evt) => {
      setHints((p) => [{
        text: evt.detail.text,
        steps: evt.detail.steps || null,
        level: evt.detail.level || null,
        branch: evt.detail.branch || null,
        ts: new Date().toLocaleTimeString(),
      }, ...p].slice(0, 30))
      setLoading(false)
    }
    window.addEventListener('ai:hint', handler)
    return () => window.removeEventListener('ai:hint', handler)
  }, [])

  useEffect(() => {
    const handler = (evt) => {
      if (evt.detail?.sessionId && currentSession?.id && evt.detail.sessionId !== currentSession.id) return
      const detail = evt.detail || {}
      setHints((p) => [{
        text: detail.next || 'Record the evidence and continue with the scenario methodology.',
        steps: [
          detail.what,
          detail.why,
          detail.next,
        ].filter(Boolean),
        level: null,
        branch: detail.tags?.length ? { label: detail.tags.join(' / ') } : null,
        ts: new Date().toLocaleTimeString(),
        isInsight: true,
      }, ...p].slice(0, 30))
    }
    window.addEventListener('terminal:insight', handler)
    return () => window.removeEventListener('terminal:insight', handler)
  }, [currentSession?.id])

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
  const totalPhases = scenarioId === 'SC-01' ? 6 : scenarioId === 'SC-02' ? 4 : scenarioId === 'SC-03' ? 5 : 6

  return (
    <div className="flex flex-col h-full bg-void animate-fade-in">
      {/* HEADER CONTROLS */}
      <div className="px-4 pt-3.5 pb-3 border-b border-cs-border bg-surface-2/20">
        <div className="flex flex-col gap-2.5">
          {/* Segmented slider toggle */}
          <div className="relative flex w-full bg-surface-3 rounded-cs-sm p-1 border border-border">
            <div
              className="absolute top-1 bottom-1 transition-all duration-300 rounded-cs-xs"
              style={{
                left: aiMode === 'learn' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
                background: aiMode === 'learn' ? 'rgba(59,139,255,0.1)' : 'rgba(255,170,0,0.1)',
                border: `1px solid ${aiMode === 'learn' ? 'rgba(59,139,255,0.3)' : 'rgba(255,170,0,0.3)'}`,
                boxShadow: aiMode === 'learn' ? '0 0 10px rgba(59,139,255,0.25)' : '0 0 10px rgba(255,170,0,0.25)'
              }}
            />
            <button
              onClick={() => onToggleMode?.('learn')}
              className={`relative z-10 flex-1 py-1.5 text-center text-xs font-mono font-bold transition-colors ${
                aiMode === 'learn' ? 'text-cs-blue font-extrabold' : 'text-txt-dim hover:text-txt-secondary'
              }`}
            >
              LEARN MODE
            </button>
            <button
              onClick={() => onToggleMode?.('challenge')}
              className={`relative z-10 flex-1 py-1.5 text-center text-xs font-mono font-bold transition-colors ${
                aiMode === 'challenge' ? 'text-amber-warn font-extrabold' : 'text-txt-dim hover:text-txt-secondary'
              }`}
            >
              CHALLENGE MODE
            </button>
          </div>
          <p className="text-[11px] text-txt-secondary font-mono leading-relaxed px-1">
            {aiMode === 'learn'
              ? '▶ Step-by-step guidance with concept explanations.'
              : '▶ Socratic questioning — you think it through, the tutor guides.'}
          </p>
        </div>
      </div>

      {/* PHASE PROGRESS TIMELINE */}
      <div className="mx-4 mt-3.5 px-3.5 py-3 rounded-cs border border-cs-border bg-surface-2/40 backdrop-blur-sm shadow-md">
        <div className="flex min-w-0 items-center gap-2 mb-2.5">
          <span className={`text-xs font-mono font-bold tracking-wider ${role === 'red' ? 'text-cs-red' : 'text-cs-blue'}`}>
            PHASE {phase} : {ctx.title.toUpperCase()}
          </span>
          {scenarioId && (
            <span className="ml-auto flex-shrink-0 text-[10px] font-bold text-txt-dim font-mono border border-border bg-surface-3 px-1.5 py-0.5 rounded-cs-sm">
              {scenarioId}
            </span>
          )}
        </div>
        
        {/* Visual progress dots and lines */}
        <div className="flex items-center justify-between mt-2 mb-3.5 px-1">
          {Array.from({ length: totalPhases }).map((_, idx) => {
            const stepNum = idx + 1
            const isActive = phase === stepNum
            const isCompleted = phase > stepNum
            return (
              <div key={stepNum} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`w-6 h-6 rounded-full border font-mono text-[10px] font-extrabold flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-cs-blue/20 text-cs-blue border-cs-blue shadow-[0_0_8px_var(--blue-glow)] scale-110'
                      : isCompleted
                        ? 'bg-green-signal/20 text-green-signal border-green-signal shadow-[0_0_6px_rgba(0,255,136,0.2)]'
                        : 'bg-surface-3 text-txt-dim border-border'
                  }`}
                  title={`Phase ${stepNum}`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                {stepNum < totalPhases && (
                  <div
                    className={`h-0.5 flex-1 mx-1.5 transition-all ${
                      isCompleted ? 'bg-green-signal' : isActive ? 'bg-cs-blue/40' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {activeBranch?.label && (
          <div className="mb-2.5 inline-flex max-w-full rounded-cs-sm border border-green-signal/20 bg-green-signal/8 px-2 py-1 text-[10px] font-mono text-green-signal leading-none">
            Active branch: {activeBranch.label}
          </div>
        )}
        <p className="text-xs text-txt-secondary leading-relaxed border-t border-border/40 pt-2">{ctx.prompt}</p>
      </div>

      {/* DIALOGUE STREAM */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {hints.length === 0 && !loading && (
          <div className="border border-border rounded-cs p-4 bg-surface-2/30 backdrop-blur-sm">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-txt-primary mb-2">AI Guidance System</h4>
            <p className="text-txt-secondary text-xs leading-relaxed mb-4">
              {aiMode === 'learn'
                ? 'Operating in Learn Mode: Your tutor observes your commands and provides detailed, structured hints with step-by-step concepts to help you succeed.'
                : 'Operating in Challenge Mode: Your tutor behaves Socratic. It will ask questions, challenge your decisions, and nudge you to think independently.'}
            </p>
            <div className="space-y-3 border-t border-border/50 pt-4">
              {[
                { level: 1, label: 'L1 Conceptual', desc: 'Focuses on the underlying security concepts.', color: 'text-amber-warn', border: 'border-amber-warn/25' },
                { level: 2, label: 'L2 Directional', desc: 'Identifies tool options and general methodologies.', color: 'text-orange-400', border: 'border-orange-400/25' },
                { level: 3, label: 'L3 Procedural', desc: 'Explicit walkthroughs and commands explained.', color: 'text-cs-red', border: 'border-cs-red/25' },
              ].map(({ level, label, desc, color, border }) => (
                <div key={level} className={`flex items-start gap-3 border-b border-border/30 pb-2.5 last:border-b-0 last:pb-0 text-xs`}>
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold flex-shrink-0 bg-surface-3 ${color} ${border}`}>{level}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-txt-primary flex items-center gap-1.5">
                      <span className={color}>{label}</span>
                      <span className="text-[10px] text-txt-dim font-mono">(-{hintPenalties[level - 1]}pts)</span>
                    </div>
                    <p className="text-txt-dim text-[11px] leading-normal mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-txt-secondary border border-cs-blue/20 rounded-cs p-3.5 bg-cs-blue/5 backdrop-blur-sm shadow-sm animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-cs-blue/30 border-t-cs-blue rounded-full animate-spin flex-shrink-0" />
            <span className="font-mono text-cs-blue">AI Co-pilot is generating response...</span>
          </div>
        )}

        {[...hints].reverse().map((h, i) => (
          <HintBubble key={i} hint={h} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ACTION PANEL */}
      <div className="border-t border-cs-border p-3.5 bg-surface-2/40 backdrop-blur-md">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-txt-dim mb-2 text-center">
          Request Guidance (Deducts points)
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { level: 1, label: 'L1', desc: 'Concept', penalty: hintPenalties[0], color: 'text-amber-warn border-amber-warn/30 hover:bg-amber-warn/10 hover:border-amber-warn/50' },
            { level: 2, label: 'L2', desc: 'Direction', penalty: hintPenalties[1], color: 'text-orange-400 border-orange-400/30 hover:bg-orange-400/10 hover:border-orange-400/50' },
            { level: 3, label: 'L3', desc: 'Walkthrough', penalty: hintPenalties[2], color: 'text-cs-red border-cs-red/30 hover:bg-cs-red/10 hover:border-cs-red/50' },
          ].map(({ level, label, desc, penalty, color }) => (
            <button
              key={level}
              onClick={() => request(level)}
              disabled={loading}
              className={`flex flex-col items-center justify-center rounded-cs border py-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
            >
              <span className="font-bold text-sm font-mono tracking-wider">{label}</span>
              <span className="text-[9px] uppercase tracking-wider text-txt-dim font-mono mt-0.5">{desc}</span>
              <span className="mt-1 text-[10px] font-bold font-mono">-{penalty} pts</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HintBubble({ hint }) {
  const parsed = hint.steps && !hint.isInsight
    ? { format: 'steps', steps: hint.steps.map((s, idx) => ({ index: idx + 1, content: s })) }
    : parseAIHint(hint.text)

  const config = hint.isError
    ? {
        avatar: 'SYS',
        name: 'System Monitor',
        avatarBg: 'bg-critical/10 text-critical border-critical/30',
        bubbleBg: 'bg-critical/5 border-critical/20 text-text-primary'
      }
    : hint.isInsight
      ? {
          avatar: 'SCAN',
          name: 'Output Insight',
          avatarBg: 'bg-green-signal/10 text-green-signal border-green-signal/30',
          bubbleBg: 'bg-green-signal/5 border-green-signal/20 text-text-primary'
        }
      : hint.level
        ? {
            avatar: `L${hint.level}`,
            name: `AI Tutor (Level ${hint.level})`,
            avatarBg: hint.level === 1
              ? 'bg-amber-warn/10 text-amber-warn border-amber-warn/30'
              : hint.level === 2
                ? 'bg-orange-400/10 text-orange-400 border-orange-400/30'
                : 'bg-cs-red/10 text-cs-red border-cs-red/30',
            bubbleBg: hint.level === 1
              ? 'bg-amber-warn/5 border-amber-warn/15 shadow-[0_0_8px_rgba(255,170,0,0.05)]'
              : hint.level === 2
                ? 'bg-orange-400/5 border-orange-400/15 shadow-[0_0_8px_rgba(251,146,60,0.05)]'
                : 'bg-cs-red/5 border-cs-red/15 shadow-[0_0_8px_rgba(255,59,59,0.05)]'
          }
        : {
            avatar: 'AI',
            name: 'AI Tutor',
            avatarBg: 'bg-cs-blue/10 text-cs-blue border-cs-blue/30',
            bubbleBg: 'bg-cs-blue/5 border-cs-blue/15 shadow-[0_0_8px_rgba(59,139,255,0.05)]'
          }

  return (
    <div className="flex gap-2.5 items-start mb-4 animate-fade-in">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full border font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 select-none ${config.avatarBg}`}>
        {config.avatar}
      </div>
      {/* Bubble Container */}
      <div className="flex-1 min-w-0">
        {/* Bubble Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-txt-primary">{config.name}</span>
          <span className="text-[10px] text-txt-dim font-mono">{hint.ts}</span>
        </div>
        {/* Bubble Body */}
        <div className={`border rounded-cs px-3.5 py-3 text-xs leading-relaxed backdrop-blur-sm shadow-sm ${config.bubbleBg}`}>
          {parsed?.format === 'tagged' && (
            <div className="space-y-3">
              {parsed.sections.map((section, idx) => {
                if (section.type === 'general') {
                  return <p key={idx} className="text-txt-primary">{section.content}</p>
                }
                return (
                  <div key={idx} className="border-l-2 pl-3 border-cs-border/60 space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block" style={{
                      color: section.type === 'Concept' ? 'var(--blue-primary)' :
                             section.type === 'What to do' ? 'var(--green-signal)' :
                             section.type === 'What to look for' ? 'var(--amber-warn)' : '#a855f7'
                    }}>
                      {section.label}
                    </span>
                    <p className="text-txt-secondary">{section.content}</p>
                  </div>
                )
              })}
            </div>
          )}

          {parsed?.format === 'steps' && (
            <div className="space-y-2.5">
              {parsed.steps.map((step, idx) => (
                <div key={idx} className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full border border-cs-border bg-surface-3 flex items-center justify-center font-mono text-[10.5px] font-bold text-txt-secondary flex-shrink-0 mt-0.5">
                    {step.index}
                  </span>
                  <p className="text-txt-primary flex-1">{step.content}</p>
                </div>
              ))}
            </div>
          )}

          {parsed?.format === 'general' && (
            <div className="space-y-2">
              {parsed.paragraphs.map((p, idx) => (
                <p key={idx} className="text-txt-primary whitespace-pre-wrap">{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
