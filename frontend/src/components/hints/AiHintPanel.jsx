import { useState, useEffect, useRef } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { EmptyState } from '../ui'

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

const CHAT_STORAGE_KEY = (sessionId) => `cs.ai.chat.${sessionId}`
const MAX_PERSISTED_HINTS = 50

const PLACEHOLDERS = [
  'Ask about port scanning…',
  'What is T1046?',
  'How do I enumerate SMB?',
  'What is Kerberoasting?',
  'Explain SQL injection…',
  'What does this MITRE technique mean?',
  'How do I escalate privileges?',
]

export default function AiHintPanel({ onSubmitQuestion, connectionState }) {
  const { phase, currentSession, activeBranch } = useSessionStore()
  const sessionId = currentSession?.id

  // Load persisted chat on mount; fallback to empty if none stored
  const [hints, setHints] = useState(() => {
    if (!sessionId) return []
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY(sessionId))
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Rotate placeholder every 4s when input is empty
  useEffect(() => {
    if (inputText) return
    const id = setInterval(() => setPlaceholderIdx((p) => (p + 1) % PLACEHOLDERS.length), 4000)
    return () => clearInterval(id)
  }, [inputText])

  // Auto-grow textarea
  const handleInput = (e) => {
    setInputText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  const role = currentSession?.role || 'red'

  // Persist hints to localStorage whenever they change
  useEffect(() => {
    if (!sessionId) return
    try {
      localStorage.setItem(CHAT_STORAGE_KEY(sessionId), JSON.stringify(hints.slice(0, MAX_PERSISTED_HINTS)))
    } catch {
      // quota exceeded — silently skip
    }
  }, [hints, sessionId])

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

    setHints((p) => [{
      text,
      sender: 'user',
      ts: new Date().toLocaleTimeString(),
    }, ...p].slice(0, 30))

    setInputText('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    setLoading(true)
    onSubmitQuestion?.(text)
  }

  const requestHint = (level) => {
    if (loading || connectionState === 'failed') return
    window.dispatchEvent(new CustomEvent('mission:request-hint', { detail: { level } }))
    setLoading(true)
  }

  const ctx = PHASE_CONTEXT[role]?.[phase] || PHASE_CONTEXT.red[1]

  return (
    <div className="flex flex-col h-full bg-void animate-fade-in">
      {/* HEADER INFO BANNER */}
      <div className="px-4 py-2.5 border-b border-cs-border/30 text-[11px] font-mono text-txt-secondary flex items-center gap-1.5 select-none shrink-0">
        <span>AI Tutor</span>
        <span className="text-txt-dim">·</span>
        <span>Phase {phase}</span>
        <span className="text-txt-dim">·</span>
        <span>{ctx?.title}</span>
        <span className="text-txt-dim">·</span>
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
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 flex flex-col">
        {hints.length === 0 ? (
          <EmptyState
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            title="AI Tutor Ready"
            body="Awaiting queries or scenario insights. Request a hint or ask a question below."
          />
        ) : (
          [...hints].reverse().map((h, i) => (
            <HintBubble key={i} hint={h} />
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-txt-secondary border border-cs-blue/20 rounded-cs p-3.5 bg-cs-blue/5 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-1 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cs-blue dot-bounce-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-cs-blue dot-bounce-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-cs-blue dot-bounce-3" />
            </div>
            <span className="font-mono text-cs-blue">AI Tutor is thinking…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ACTION CHAT INPUT */}
      <div className="border-t border-cs-border bg-surface-2/40 backdrop-blur-md shrink-0">
        {/* Quick hint request buttons */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-0">
          <span className="text-[9.5px] font-mono text-txt-dim uppercase tracking-wider mr-1">Hint:</span>
          {[1, 2, 3].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => requestHint(lvl)}
              disabled={loading || connectionState === 'failed'}
              className={`text-[9.5px] font-mono px-2 py-0.5 rounded-cs-sm border transition-colors disabled:opacity-40 ${
                lvl === 1 ? 'border-amber-warn/30 text-amber-warn bg-amber-warn/5 hover:bg-amber-warn/10' :
                lvl === 2 ? 'border-orange-400/30 text-orange-400 bg-orange-400/5 hover:bg-orange-400/10' :
                            'border-cs-red/30 text-cs-red bg-cs-red/5 hover:bg-cs-red/10'
              }`}
              title={`Request Level ${lvl} hint${lvl === 1 ? ' (−2 pts)' : lvl === 2 ? ' (−5 pts)' : ' (−10 pts)'}`}
            >
              L{lvl} {lvl === 1 ? '−2' : lvl === 2 ? '−5' : '−10'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-3 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
            }}
            disabled={loading || connectionState === 'failed'}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            rows={1}
            className="flex-1 bg-surface-3 border border-cs-border rounded-cs-sm px-3 py-1.5 text-xs text-txt-primary placeholder:text-txt-dim focus:outline-none focus:border-cs-blue/50 transition-colors disabled:opacity-40 resize-none overflow-hidden leading-relaxed"
            style={{ minHeight: '32px', maxHeight: '96px' }}
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim() || connectionState === 'failed'}
            className="btn-v3 btn-v3-blue btn-v3-sm text-[11px] font-mono px-3.5 py-1.5 disabled:opacity-45 flex-shrink-0"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="text-txt-dim hover:text-txt-secondary p-1 transition-colors flex-shrink-0"
            title="Tutor Info"
            aria-label="Tutor info"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

function HintBubble({ hint }) {
  const [copied, setCopied] = useState(false)
  const isAi = !hint.sender || hint.sender === 'system_welcome'

  const copyText = () => {
    navigator.clipboard?.writeText(hint.text || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

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
            bubbleBg: 'bg-critical/5 border-critical/20 text-txt-primary'
          }
        : hint.isInsight
          ? {
              avatar: 'SCAN',
              name: 'Output Insight',
              avatarBg: 'bg-green-signal/10 text-green-signal border-green-signal/30',
              bubbleBg: 'bg-green-signal/5 border-green-signal/20 text-txt-primary'
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
        <div className={`border rounded-cs px-3.5 py-3 text-xs leading-relaxed backdrop-blur-sm shadow-sm ${config.bubbleBg} group/bubble`}>
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

          {/* Action row — shown on hover for AI messages */}
          {isAi && hint.sender !== 'user' && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-cs-border/30 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-150">
              <button
                onClick={copyText}
                aria-label="Copy message"
                className="text-[9.5px] font-mono text-txt-dim hover:text-txt-secondary px-2 py-0.5 rounded border border-transparent hover:border-cs-border transition-colors"
              >
                {copied ? '✓ copied' : 'copy'}
              </button>
              <button aria-label="Helpful" className="text-[11px] hover:scale-110 transition-transform" title="Helpful">👍</button>
              <button aria-label="Not helpful" className="text-[11px] hover:scale-110 transition-transform" title="Not helpful">👎</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
