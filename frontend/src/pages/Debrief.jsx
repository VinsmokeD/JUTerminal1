import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import KillChainTimeline from '../components/debrief/KillChainTimeline'

export default function Debrief() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [score, setScore] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/sessions/${sessionId}`),
      api.get(`/scoring/${sessionId}`),
    ]).then(([sessRes, scoreRes]) => {
      setSession(sessRes.data)
      setScore(scoreRes.data)
    }).catch(() => navigate('/')).finally(() => setLoading(false))
  }, [sessionId])

  const downloadReport = async () => {
    const res = await api.get(`/reports/${sessionId}`)
    const blob = new Blob([res.data], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cybersim-report-${sessionId.slice(0, 8)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">Loading debrief...</div>
  )

  if (!session) return null

  const grade = score?.final_score >= 80 ? { label: 'Excellent', color: 'text-green-400' }
    : score?.final_score >= 60 ? { label: 'Satisfactory', color: 'text-yellow-400' }
    : { label: 'Needs improvement', color: 'text-red-400' }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-300 text-sm">← Dashboard</button>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-white mb-1">Mission Debrief</h1>
              <p className="text-gray-400 text-sm">{session.scenario_id} — {session.role.toUpperCase()} Team</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{score?.final_score ?? session.score}</div>
              <div className={`text-sm font-medium ${grade.color}`}>{grade.label}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Methodology', value: session.methodology.toUpperCase() },
              { label: 'Hints used', value: `${session.hints_used?.length || 0}` },
              { label: 'Final phase', value: `Phase ${session.phase}` },
              { label: 'Status', value: session.completed_at ? 'Completed' : 'In progress' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <div className="text-sm text-white font-medium">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadReport}
              className="flex-1 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              Export report (.md)
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2 rounded border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              New scenario
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-500">
          Your notes, commands, and SIEM events have been saved for this session. The report includes all #finding, #evidence, #ioc, and #remediation notes.
        </div>

        {/* Phase 17 — Kill Chain Timeline */}
        <KillChainTimeline sessionId={sessionId} />
      </div>
    </div>
  )
}
