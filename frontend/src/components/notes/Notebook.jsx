import { useState, useEffect } from 'react'
import api from '../../lib/api'

const TAGS = ['note', 'finding', 'evidence', 'ioc', 'remediation', 'todo']

const TAG_STYLE = {
  finding: 'text-red-400 border-red-700 bg-red-950',
  evidence: 'text-blue-400 border-blue-700 bg-blue-950',
  ioc: 'text-purple-400 border-purple-700 bg-purple-950',
  remediation: 'text-green-400 border-green-700 bg-green-950',
  todo: 'text-yellow-400 border-yellow-700 bg-yellow-950',
  note: 'text-gray-400 border-gray-700 bg-gray-800',
}

export default function Notebook({ sessionId }) {
  const [notes, setNotes] = useState([])
  const [draft, setDraft] = useState('')
  const [tag, setTag] = useState('note')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    api.get(`/notes/${sessionId}`).then((r) => setNotes(r.data)).catch(() => {})
  }, [sessionId])

  const save = async () => {
    if (!draft.trim()) return
    setSaving(true)
    try {
      const res = await api.post('/notes/', { session_id: sessionId, tag, content: draft.trim(), phase: 1 })
      setNotes((p) => [...p, res.data])
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    await api.delete(`/notes/${id}`)
    setNotes((p) => p.filter((n) => n.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {notes.length === 0 ? (
          <p className="text-gray-700 text-xs p-2">No notes yet. Add your first finding or observation.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={`rounded border px-2 py-1.5 text-xs group relative ${TAG_STYLE[n.tag] || TAG_STYLE.note}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold uppercase text-xs opacity-70">#{n.tag}</span>
                <span className="text-gray-600 text-xs">{new Date(n.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              <button
                onClick={() => remove(n.id)}
                className="absolute top-1 right-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-gray-800 p-2 space-y-1.5">
        <div className="flex gap-1 flex-wrap">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${tag === t ? TAG_STYLE[t] : 'text-gray-600 border-gray-700 hover:text-gray-400'}`}
            >
              #{t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save() }}
            placeholder="Add note... (Ctrl+Enter to save)"
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600 resize-none"
          />
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            className="px-3 text-xs bg-blue-700 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors self-end"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
