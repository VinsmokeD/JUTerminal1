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
    // Timeout with fallback message if no response in 12s
    setTimeout(() => {
      setLoading((current) => {
        if (current) {
          setHints((p) => [{
            text: 'Hint service is taking longer than expected. The hint system uses pre-built guidance when the AI service is unavailable — try again.',
            level: null,
            ts: new Date().toLocaleTimeString(),
            isError: true,
          }, ...p].slice(0, 20))
        }
        return false
      })
    }, 12000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {hints.length === 0 && !loading && (
          <div className="space-y-3">
            <div className="border border-gray-800 rounded p-3 bg-gray-900/50">
              <p className="text-gray-400 text-xs leading-relaxed mb-2">
                The AI monitor observes your actions and provides Socratic guidance to help you learn — not just the answer, but the reasoning behind each step.
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  <span className="text-yellow-400 font-medium">L1 Conceptual</span>
                  <span className="text-gray-600">— What concept applies here?</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                  <span className="text-orange-400 font-medium">L2 Directional</span>
                  <span className="text-gray-600">— Which tool and approach?</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-red-400 font-medium">L3 Procedural</span>
                  <span className="text-gray-600">— Exact commands to run</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 border border-gray-800 rounded p-3 bg-gray-900/50">
            <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
            Generating hint...
          </div>
        )}
        {hints.map((h, i) => (
          <HintCard key={i} hint={h} />
        ))}
      </div>
      <div className="border-t border-gray-800 p-2.5">
        <p className="text-xs text-gray-600 mb-2">Request a hint (costs points — higher levels reveal more)</p>
        <div className="flex gap-1.5">
          {[
            { level: 1, label: 'L1 Conceptual', penalty: '-5 pts', color: 'text-yellow-400 border-yellow-800 hover:bg-yellow-950' },
            { level: 2, label: 'L2 Directional', penalty: '-10 pts', color: 'text-orange-400 border-orange-800 hover:bg-orange-950' },
            { level: 3, label: 'L3 Procedural', penalty: '-20 pts', color: 'text-red-400 border-red-800 hover:bg-red-950' },
          ].map(({ level, label, penalty, color }) => (
            <button
              key={level}
              onClick={() => request(level)}
              disabled={loading}
              className={`flex-1 py-2 rounded border text-xs transition-colors disabled:opacity-50 ${color}`}
            >
              <div className="font-medium">{label}</div>
              <div className="text-gray-500 mt-0.5">{penalty}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HintCard({ hint }) {
  const levelColor = { 1: 'border-yellow-800 bg-yellow-950/20', 2: 'border-orange-800 bg-orange-950/20', 3: 'border-red-800 bg-red-950/20' }
  const levelLabel = { 1: 'Conceptual', 2: 'Directional', 3: 'Procedural' }
  const style = hint.isError ? 'border-gray-700 bg-gray-900' : (hint.level ? levelColor[hint.level] : 'border-blue-800 bg-blue-950/20')

  return (
    <div className={`border ${style} rounded p-3`}>
      <div className="flex items-center gap-2 mb-2">
        {hint.level ? (
          <span className="text-xs font-medium text-gray-400">L{hint.level} {levelLabel[hint.level]}</span>
        ) : hint.isError ? (
          <span className="text-xs text-gray-500">System</span>
        ) : (
          <span className="text-xs text-blue-400 font-medium">AI Monitor</span>
        )}
        <span className="text-xs text-gray-600 ml-auto">{hint.ts}</span>
      </div>
      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{hint.text}</p>
    </div>
  )
}
