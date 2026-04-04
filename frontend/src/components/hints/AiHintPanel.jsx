import { useState, useEffect } from 'react'

export default function AiHintPanel({ onRequestHint }) {
  const [hints, setHints] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (evt) => {
      setHints((p) => [{ text: evt.detail.text, level: evt.detail.level || null, ts: new Date().toLocaleTimeString() }, ...p].slice(0, 20))
      setLoading(false)
    }
    window.addEventListener('ai:hint', handler)
    return () => window.removeEventListener('ai:hint', handler)
  }, [])

  const request = (level) => {
    setLoading(true)
    onRequestHint(level)
    // Timeout if no response in 8s
    setTimeout(() => setLoading(false), 8000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {hints.length === 0 && !loading && (
          <p className="text-gray-700 text-xs">
            The AI monitor observes your actions and offers guidance. Request a hint if you're stuck.
          </p>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 border border-gray-600 border-t-blue-400 rounded-full animate-spin" />
            Thinking...
          </div>
        )}
        {hints.map((h, i) => (
          <HintCard key={i} hint={h} />
        ))}
      </div>
      <div className="border-t border-gray-800 p-2">
        <p className="text-xs text-gray-600 mb-2">Request a hint (costs points)</p>
        <div className="flex gap-1.5">
          {[
            { level: 1, label: 'L1 Conceptual', penalty: '-5', color: 'text-yellow-400 border-yellow-800 hover:bg-yellow-950' },
            { level: 2, label: 'L2 Directional', penalty: '-10', color: 'text-orange-400 border-orange-800 hover:bg-orange-950' },
            { level: 3, label: 'L3 Procedural', penalty: '-20', color: 'text-red-400 border-red-800 hover:bg-red-950' },
          ].map(({ level, label, penalty, color }) => (
            <button
              key={level}
              onClick={() => request(level)}
              disabled={loading}
              className={`flex-1 py-1.5 rounded border text-xs transition-colors disabled:opacity-50 ${color}`}
            >
              <div>{label}</div>
              <div className="text-gray-500 text-xs">{penalty} pts</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HintCard({ hint }) {
  const levelColor = { 1: 'border-yellow-800', 2: 'border-orange-800', 3: 'border-red-800' }
  const border = hint.level ? levelColor[hint.level] : 'border-gray-700'

  return (
    <div className={`border ${border} rounded p-2.5 bg-gray-900`}>
      <div className="flex items-center gap-2 mb-1.5">
        {hint.level && (
          <span className="text-xs text-gray-500">L{hint.level} hint</span>
        )}
        <span className="text-xs text-gray-600 ml-auto">{hint.ts}</span>
      </div>
      <p className="text-xs text-gray-300 leading-relaxed">{hint.text}</p>
    </div>
  )
}
