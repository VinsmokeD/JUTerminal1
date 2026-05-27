import { useState, useEffect, useRef } from 'react'
import { useSessionStore } from '../../store/sessionStore'

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

const renderTextWithMarkdown = (text) => {
  if (!text) return ''
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold: **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-txt-primary">$1</strong>')

  // Inline Code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-3 border border-cs-border font-mono text-[11px] text-cs-blue font-semibold">$1</code>')

  // Links: [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cs-blue hover:underline font-medium">$1</a>')

  // Line breaks
  escaped = escaped.replace(/\n/g, '<br />')

  return escaped
}

export default function AiHintPanel({ onSubmitQuestion, connectionState }) {
  const [hints, setHints] = useState([])
  const [loading, setLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const { phase, currentSession, activeBranch } = useSessionStore()
  const messagesEndRef = useRef(null)

  const role = currentSession?.role || 'red'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [hints, loading])

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

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || loading || connectionState === 'failed') return

    // Add user question to stream
    setHints((p) => [{
      text,
      sender: 'user',
      ts: new Date().toLocaleTimeString(),
    }, ...p].slice(0, 30))

    setInputText('')
    setLoading(true)
    onSubmitQuestion?.(text)
  }

  const ctx = PHASE_CONTEXT[role]?.[phase] || PHASE_CONTEXT.red[1]

  return (
    <div className="flex flex-col h-full bg-void animate-fade-in">
      {/* HEADER INFO BANNER */}
      <div className="px-4 py-2 border-b border-cs-border bg-surface-2/40 text-[11px] font-mono text-txt-secondary flex items-center gap-1.5 select-none shrink-0">
        <span>AI Tutor</span>
        <span className="text-txt-dim">•</span>
        <span>Phase {phase}</span>
        <span className="text-txt-dim">•</span>
        <span>{ctx?.title}</span>
        <span className="text-txt-dim">•</span>
        <span>Branch: {activeBranch?.label || '—'}</span>
      </div>

      {showInfo && (
        <div className="mx-4 mt-3 p-3 rounded-cs border border-cs-blue/30 bg-cs-blue/5 text-[11.5px] text-txt-secondary leading-relaxed font-mono relative shrink-0">
          <button onClick={() => setShowInfo(false)} className="absolute top-1.5 right-2 text-txt-dim hover:text-txt-primary">×</button>
          <div className="font-bold text-cs-blue uppercase mb-1 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Socratic Guidance
          </div>
          <p className="mb-1">Ask questions about security concepts, tools, or methodology. The tutor is Socratic and guides you without giving direct solutions.</p>
          <p>Asking questions helps clarify steps, but can apply minor score deductions depending on active difficulty settings.</p>
        </div>
      )}

      {/* DIALOGUE STREAM */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4">
        {hints.length === 0 && (
          <HintBubble hint={{
            text: "AI Tutor initialized. Awaiting queries or scenario insights.",
            ts: "Ready",
            sender: "system_welcome"
          }} />
        )}

        {[...hints].reverse().map((h, i) => (
          <HintBubble key={i} hint={h} />
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-txt-secondary border border-cs-blue/20 rounded-cs p-3.5 bg-cs-blue/5 backdrop-blur-sm shadow-sm animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-cs-blue/30 border-t-cs-blue rounded-full animate-spin flex-shrink-0" />
            <span className="font-mono text-cs-blue">AI Tutor is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ACTION CHAT INPUT */}
      <form onSubmit={handleSubmit} className="border-t border-cs-border p-3 bg-surface-2/40 backdrop-blur-md flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading || connectionState === 'failed'}
          placeholder="Ask the tutor a question..."
          className="flex-1 bg-surface-3 border border-cs-border rounded-cs-sm px-3 py-1.5 text-xs text-txt-primary placeholder:text-txt-dim focus:outline-none focus:border-cs-blue/50 transition-colors disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim() || connectionState === 'failed'}
          className="btn-v3 btn-v3-blue btn-v3-sm text-[11px] font-mono px-3.5 py-1.5 disabled:opacity-45"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="text-txt-dim hover:text-txt-secondary p-1 transition-colors flex-shrink-0"
          title="Tutor Info"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </form>
    </div>
  )
}

function HintBubble({ hint }) {
  const parsed = hint.sender === 'user' || hint.sender === 'system_welcome'
    ? { format: 'general', paragraphs: [hint.text] }
    : (hint.steps && !hint.isInsight
        ? { format: 'steps', steps: hint.steps.map((s, idx) => ({ index: idx + 1, content: s })) }
        : parseAIHint(hint.text))

  const config = hint.sender === 'system_welcome'
    ? {
        avatar: 'AI',
        name: 'AI Tutor',
        avatarBg: 'bg-cs-blue/10 text-cs-blue border-cs-blue/30',
        bubbleBg: 'bg-cs-blue/5 border-cs-blue/15 shadow-[0_0_8px_rgba(59,139,255,0.05)]'
      }
    : hint.sender === 'user'
      ? {
          avatar: 'YOU',
          name: 'Student',
          avatarBg: 'bg-surface-3 text-txt-primary border-cs-border',
          bubbleBg: 'bg-surface-2/60 border-cs-border text-txt-primary'
        }
      : hint.isError
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
                  return <p key={idx} className="text-txt-primary" dangerouslySetInnerHTML={{ __html: renderTextWithMarkdown(section.content) }} />
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
                    <p className="text-txt-secondary" dangerouslySetInnerHTML={{ __html: renderTextWithMarkdown(section.content) }} />
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
                  <p className="text-txt-primary flex-1" dangerouslySetInnerHTML={{ __html: renderTextWithMarkdown(step.content) }} />
                </div>
              ))}
            </div>
          )}

          {parsed?.format === 'general' && (
            <div className="space-y-2">
              {parsed.paragraphs.map((p, idx) => (
                <p key={idx} className="text-txt-primary" dangerouslySetInnerHTML={{ __html: renderTextWithMarkdown(p) }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
