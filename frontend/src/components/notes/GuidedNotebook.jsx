import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import api from '../../lib/api'

const TAGS = ['note', 'finding', 'evidence', 'ioc', 'remediation', 'todo']

const TAG_STYLE = {
  finding:     { badge: 'text-cs-red border-cs-red/30 bg-cs-red/5',       dot: 'bg-cs-red' },
  evidence:    { badge: 'text-cs-blue border-cs-blue/30 bg-cs-blue/5',    dot: 'bg-cs-blue' },
  ioc:         { badge: 'text-purple-400 border-purple-400/30 bg-purple-400/5', dot: 'bg-purple-400' },
  remediation: { badge: 'text-green-signal border-green-signal/30 bg-green-signal/5', dot: 'bg-green-signal' },
  todo:        { badge: 'text-amber-warn border-amber-warn/30 bg-amber-warn/5', dot: 'bg-amber-warn' },
  note:        { badge: 'text-txt-secondary border-cs-border bg-surface-2/50', dot: 'bg-txt-dim' },
}

const TEMPLATES = {
  red: {
    1: '## Reconnaissance\n### Target Information\n- IP: \n- Open ports: \n- Services: \n\n### Technology Stack\n- Web Server: \n- Language/Framework: \n- Database: \n\n### Observations\n- ',
    2: '## Enumeration Findings\n### Directories / Paths Found\n- Path:            Status:            Interesting? \n\n### Potential Attack Vectors\n- \n\n### Evidence\n[Save terminal output as evidence]',
    3: '## Vulnerability Identification\n### Confirmed Vulnerabilities\n- Type: \n- Location: \n- Severity (CVSS): \n- Evidence: \n\n### Failed Attempts\n- ',
    4: '## Exploitation\n### Successful Exploitation\n- Technique: \n- Impact achieved: \n- Evidence: \n\n### Attack Chain\n1. \n2. \n3. ',
    5: '## Post-Exploitation\n### Data Accessed\n- \n\n### Privilege Level Achieved\n- \n\n### Evidence Collected\n- ',
    6: '## Report Notes\n### Executive Summary Points\n- \n\n### Key Findings\n- \n\n### Remediation Recommendations\n- ',
  },
  blue: {
    1: '## Incident Identification\n### Initial Alert\n- Event ID: \n- Severity: \n- Source IP: \n- Timestamp: \n\n### Scope Assessment\n- Affected systems: \n- Affected users: ',
    2: '## Detection and Analysis\n### Attack Timeline\n- First event: \n- Progression: \n- Latest activity: \n\n### True Positive Assessment\n- Classification: \n- Evidence: ',
    3: '## Containment\n### Actions Taken\n- [ ] Blocked source IP\n- [ ] Isolated affected hosts\n- [ ] Disabled compromised accounts\n- [ ] Preserved evidence\n\n### Justification\n- ',
    4: '## Eradication\n### Persistence Mechanisms Found\n- \n\n### Cleanup Actions\n- \n\n### Verification\n- ',
    5: '## Recovery\n### Systems Restored\n- \n\n### Monitoring Plan\n- ',
    6: '## Post-Incident Report\n### IOC List\n- \n\n### Root Cause\n- \n\n### Recommendations\n1. \n2. \n3. ',
  },
}

export default function GuidedNotebook({ sessionId, role = 'red', phase = 1 }) {
  const [notes, setNotes] = useState([])
  const [draft, setDraft] = useState('')
  const [tag, setTag] = useState('note')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('guided')
  const { skillLevel } = useAuthStore()
  const { pendingEvidence, clearPendingEvidence } = useSessionStore()

  useEffect(() => {
    if (!sessionId) return
    api.get(`/notes/${sessionId}`).then((r) => setNotes(r.data)).catch(() => {})
  }, [sessionId])

  useEffect(() => {
    if (mode === 'guided' && notes.length === 0 && skillLevel === 'beginner') {
      const template = TEMPLATES[role]?.[phase] || TEMPLATES[role]?.[1] || ''
      setDraft(template)
    }
  }, [phase, mode, skillLevel, role])

  const save = async () => {
    if (!draft.trim()) return
    setSaving(true)
    try {
      const res = await api.post('/notes/', { session_id: sessionId, tag, content: draft.trim(), phase })
      setNotes((p) => [...p, res.data])
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  const saveEvidence = async () => {
    if (!pendingEvidence) return
    setSaving(true)
    try {
      const discoveries = pendingEvidence.discoveries || {}
      const summaryParts = []
      for (const [key, items] of Object.entries(discoveries)) {
        if (items.length > 0) summaryParts.push(`${key}: ${items.join(', ')}`)
      }
      const content = `[Auto-captured] Command: ${pendingEvidence.command}\nDiscovered: ${summaryParts.join('; ')}`
      const res = await api.post('/notes/', { session_id: sessionId, tag: 'evidence', content, phase })
      setNotes((p) => [...p, res.data])
      clearPendingEvidence()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    await api.delete(`/notes/${id}`)
    setNotes((p) => p.filter((n) => n.id !== id))
  }

  const loadTemplate = () => {
    const template = TEMPLATES[role]?.[phase] || ''
    if (template) setDraft(template)
  }

  return (
    <div className="flex flex-col h-full bg-void">
      {pendingEvidence && (
        <div className="mx-2 mt-2 p-2.5 rounded-cs border border-cs-blue/30 bg-cs-blue/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cs-blue animate-pulse flex-shrink-0" />
          <span className="text-xs text-cs-blue flex-1">
            {pendingEvidence.tool} found new items — save as evidence?
          </span>
          <button onClick={saveEvidence} className="text-xs text-cs-blue hover:text-cs-blue/80 font-medium px-2 py-0.5 rounded-cs-sm bg-cs-blue/10 border border-cs-blue/20 transition-colors">
            Save
          </button>
          <button onClick={clearPendingEvidence} className="text-xs text-txt-dim hover:text-txt-secondary transition-colors">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {notes.length === 0 ? (
          <div className="p-4 text-xs text-txt-dim font-mono leading-relaxed">
            {skillLevel === 'beginner'
              ? 'Start documenting your findings. Good note-taking is a critical professional skill — every observation matters.'
              : 'No notes yet. Add your first finding or observation.'}
          </div>
        ) : (
          notes.map((n) => {
            const ts = TAG_STYLE[n.tag] || TAG_STYLE.note
            return (
              <div key={n.id} className={`rounded-cs border px-2.5 py-2 text-xs group relative ${ts.badge}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className={`w-1 h-1 rounded-full flex-shrink-0 ${ts.dot}`} />
                  <span className="font-semibold uppercase tracking-wide opacity-60 font-mono" style={{ fontSize: '10px' }}>#{n.tag}</span>
                  <span className="text-txt-dim font-mono" style={{ fontSize: '10px' }}>{new Date(n.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-txt-primary leading-relaxed whitespace-pre-wrap">{n.content}</p>
                <button
                  onClick={() => remove(n.id)}
                  className="absolute top-1.5 right-1.5 text-txt-dim hover:text-cs-red opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1"
                >
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-cs-border p-2 space-y-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {TAGS.map((t) => {
            const ts = TAG_STYLE[t] || TAG_STYLE.note
            return (
              <button key={t} onClick={() => setTag(t)}
                className={`text-xs px-2 py-0.5 rounded-cs-sm border transition-colors font-mono ${tag === t ? ts.badge : 'text-txt-dim border-cs-border hover:text-txt-secondary hover:border-cs-border-glow'}`}>
                #{t}
              </button>
            )
          })}
          <div className="ml-auto flex gap-1">
            <button onClick={() => setMode(mode === 'guided' ? 'freeform' : 'guided')}
              className="text-xs text-txt-dim hover:text-txt-secondary px-1.5 py-0.5 rounded-cs-sm border border-cs-border transition-colors">
              {mode === 'guided' ? 'Freeform' : 'Guided'}
            </button>
            {mode === 'guided' && (
              <button onClick={loadTemplate}
                className="text-xs text-cs-blue hover:text-cs-blue/80 px-1.5 py-0.5 rounded-cs-sm border border-cs-blue/30 transition-colors">
                Template
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <textarea
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save() }}
            placeholder={mode === 'guided' ? 'Use the template button or type freely... (Ctrl+Enter to save)' : 'Add note... (Ctrl+Enter to save)'}
            rows={3}
            className="flex-1 bg-surface-2 border border-cs-border rounded-cs px-2.5 py-2 text-xs text-txt-primary placeholder-txt-dim focus:outline-none focus:border-cs-blue/50 resize-none font-mono transition-colors"
          />
          <button onClick={save} disabled={saving || !draft.trim()}
            className="px-3 text-xs bg-cs-blue/15 hover:bg-cs-blue/25 disabled:bg-surface-2 disabled:text-txt-dim text-cs-blue border border-cs-blue/30 rounded-cs transition-colors self-end py-2 font-mono font-medium">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
