import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import api from '../../lib/api'

const TAGS = ['note', 'finding', 'evidence', 'ioc', 'remediation', 'todo']

const TAG_STYLE = {
  finding: 'text-rose-400 border-rose-800/50 bg-rose-950/30',
  evidence: 'text-cyan-400 border-cyan-800/50 bg-cyan-950/30',
  ioc: 'text-purple-400 border-purple-800/50 bg-purple-950/30',
  remediation: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30',
  todo: 'text-amber-400 border-amber-800/50 bg-amber-950/30',
  note: 'text-slate-400 border-slate-800 bg-slate-800/30',
}

// Phase-aware templates for guided note-taking
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
    2: '## Detection & Analysis\n### Attack Timeline\n- First event: \n- Progression: \n- Latest activity: \n\n### True Positive / False Positive Assessment\n- Classification: \n- Evidence: ',
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
  const [mode, setMode] = useState('guided') // guided | freeform
  const { skillLevel } = useAuthStore()
  const { pendingEvidence, clearPendingEvidence } = useSessionStore()

  useEffect(() => {
    if (!sessionId) return
    api.get(`/notes/${sessionId}`).then((r) => setNotes(r.data)).catch(() => {})
  }, [sessionId])

  // Pre-fill template for beginners
  useEffect(() => {
    if (mode === 'guided' && notes.length === 0 && skillLevel === 'beginner') {
      const template = TEMPLATES[role]?.[phase] || TEMPLATES[role]?.[1] || ''
      setDraft(template)
    }
  }, [phase, mode, skillLevel, role])

  // Handle auto-evidence events
  useEffect(() => {
    const handler = (evt) => {
      const data = evt.detail
      if (data && data.command) {
        const summaryParts = []
        for (const [key, items] of Object.entries(data.discoveries || {})) {
          if (items.length > 0) summaryParts.push(`${key}: ${items.join(', ')}`)
        }
        if (summaryParts.length > 0) {
          // Auto-evidence toast is handled by the parent workspace
        }
      }
    }
    window.addEventListener('evidence:discovered', handler)
    return () => window.removeEventListener('evidence:discovered', handler)
  }, [])

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
    <div className="flex flex-col h-full">
      {/* Auto-evidence toast */}
      {pendingEvidence && (
        <div className="mx-2 mt-2 p-2.5 rounded-lg border border-cyan-800/50 bg-cyan-950/20 flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs text-cyan-300 flex-1">
            {pendingEvidence.tool} found new items — save as evidence?
          </span>
          <button onClick={saveEvidence} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-0.5 rounded bg-cyan-950/50">Save</button>
          <button onClick={clearPendingEvidence} className="text-xs text-slate-600 hover:text-slate-400">Dismiss</button>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {notes.length === 0 ? (
          <div className="p-3 text-xs text-slate-600">
            {skillLevel === 'beginner'
              ? 'Start documenting your findings. Good note-taking is a critical professional skill — every observation matters.'
              : 'No notes yet. Add your first finding or observation.'}
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={`rounded-lg border px-2.5 py-2 text-xs group relative ${TAG_STYLE[n.tag] || TAG_STYLE.note}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold uppercase opacity-70" style={{ fontSize: '10px' }}>#{n.tag}</span>
                <span className="text-slate-600" style={{ fontSize: '10px' }}>{new Date(n.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              <button
                onClick={() => remove(n.id)}
                className="absolute top-1.5 right-1.5 text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >x</button>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 p-2 space-y-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {TAGS.map((t) => (
            <button key={t} onClick={() => setTag(t)}
              className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${tag === t ? TAG_STYLE[t] : 'text-slate-600 border-slate-800 hover:text-slate-400'}`}>
              #{t}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <button onClick={() => setMode(mode === 'guided' ? 'freeform' : 'guided')}
              className="text-xs text-slate-600 hover:text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
              {mode === 'guided' ? 'Freeform' : 'Guided'}
            </button>
            {mode === 'guided' && (
              <button onClick={loadTemplate}
                className="text-xs text-cyan-600 hover:text-cyan-400 px-1.5 py-0.5 rounded border border-slate-800">
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
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-600 resize-none font-mono"
          />
          <button onClick={save} disabled={saving || !draft.trim()}
            className="px-3 text-xs bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors self-end">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
