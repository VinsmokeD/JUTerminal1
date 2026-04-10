import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import KillChainTimeline from '../components/debrief/KillChainTimeline'

const MOCK_KILL_CHAIN_EVENTS = [
  { team: 'red', timestamp: '2026-04-08T10:01:20Z', title: 'Port Scan Initiated', description: 'Nmap service version scan against target network.' },
  { team: 'blue', timestamp: '2026-04-08T10:01:34Z', title: 'Network Scan Detected', description: 'SIEM alert: rapid SYN packets from single source IP.' },
  { team: 'red', timestamp: '2026-04-08T10:03:05Z', title: 'Directory Enumeration', description: 'Gobuster brute-force against web server paths.' },
  { team: 'blue', timestamp: '2026-04-08T10:03:18Z', title: 'Anomalous 404 Burst', description: 'Elevated 404 error rate detected — possible enumeration.' },
  { team: 'red', timestamp: '2026-04-08T10:06:42Z', title: 'SQL Injection Attempt', description: 'SQLMap automated injection testing on login form.' },
  { team: 'blue', timestamp: '2026-04-08T10:06:55Z', title: 'WAF Alert: SQLi Pattern', description: 'ModSecurity rule triggered for UNION SELECT pattern.' },
  { team: 'red', timestamp: '2026-04-08T10:10:20Z', title: 'Web Shell Upload', description: 'PHP shell uploaded via unrestricted file upload.' },
  { team: 'blue', timestamp: '2026-04-08T10:10:35Z', title: 'Endpoint Alert', description: 'Suspicious PHP process spawn detected on web server.' },
]

export default function Debrief() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [score, setScore] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    Promise.all([
      api.get(`/sessions/${sessionId}`),
      api.get(`/scoring/${sessionId}`),
      api.get(`/notes/${sessionId}`).catch(() => ({ data: [] })),
    ]).then(([sessRes, scoreRes, notesRes]) => {
      setSession(sessRes.data)
      setScore(scoreRes.data)
      setNotes(notesRes.data || [])
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

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Loading debrief...</div>
  if (!session) return null

  const finalScore = score?.final_score ?? session.score
  const grade = finalScore >= 80 ? { label: 'Excellent', color: 'text-emerald-400', bg: 'from-emerald-600/20 to-teal-600/20' }
    : finalScore >= 60 ? { label: 'Satisfactory', color: 'text-amber-400', bg: 'from-amber-600/20 to-orange-600/20' }
    : { label: 'Needs Improvement', color: 'text-rose-400', bg: 'from-rose-600/20 to-red-600/20' }

  const findings = notes.filter(n => n.tag === 'finding')
  const evidence = notes.filter(n => n.tag === 'evidence')
  const iocs = notes.filter(n => n.tag === 'ioc')
  const remediations = notes.filter(n => n.tag === 'remediation')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Dashboard
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={downloadReport}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/10">
              Export report (.md)
            </button>
            <button onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors">
              New scenario
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Score hero */}
        <div className={`bg-gradient-to-br ${grade.bg} rounded-2xl border border-slate-800/50 p-8 mb-8`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Mission Debrief</p>
              <h1 className="text-2xl font-bold text-white mb-2">{session.scenario_id} — {session.role.toUpperCase()} Team</h1>
              <p className="text-slate-400 text-sm">{session.methodology.toUpperCase()} methodology</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-white mb-1">{finalScore}</div>
              <div className={`text-sm font-semibold ${grade.color}`}>{grade.label}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Final Phase', value: `Phase ${session.phase}`, icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
              { label: 'Findings', value: `${findings.length}`, icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z' },
              { label: 'Evidence', value: `${evidence.length}`, icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
              { label: 'Hints Used', value: `${session.hints_used?.length || 0}`, icon: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-900/30 backdrop-blur-sm rounded-xl p-4 border border-slate-800/30">
                <svg className="w-5 h-5 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900/30 rounded-xl p-1 border border-slate-800/30">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'findings', label: `Findings (${findings.length})` },
            { id: 'timeline', label: 'Kill Chain' },
            { id: 'notes', label: `All Notes (${notes.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Session Summary</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {session.role === 'red'
                  ? `Completed a ${session.methodology.toUpperCase()} penetration test of ${session.scenario_id}, reaching Phase ${session.phase}. Documented ${findings.length} findings with ${evidence.length} pieces of evidence.`
                  : `Performed incident response for ${session.scenario_id} using NIST 800-61 framework, reaching Phase ${session.phase}. Extracted ${iocs.length} IOCs and documented ${findings.length} findings.`
                }
              </p>
            </div>
            {remediations.length > 0 && (
              <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl p-5">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {remediations.map(r => (
                    <div key={r.id} className="text-sm text-emerald-300 flex gap-2">
                      <span className="text-emerald-600">*</span>
                      {r.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'findings' && (
          <div className="space-y-3">
            {findings.length === 0 ? (
              <p className="text-sm text-slate-600 p-4">No findings were tagged during this session. Tag notes as #finding to include them in your report.</p>
            ) : (
              findings.map((f, i) => (
                <div key={f.id} className="bg-slate-900/30 border border-rose-800/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-rose-400">Finding #{i + 1}</span>
                    <span className="text-xs text-slate-600">Phase {f.phase}</span>
                    <span className="text-xs text-slate-700 ml-auto">{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{f.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <KillChainTimeline events={MOCK_KILL_CHAIN_EVENTS} />
        )}

        {activeTab === 'notes' && (
          <div className="space-y-2">
            {notes.map(n => {
              const tagColors = {
                finding: 'border-rose-800/30 bg-rose-950/10',
                evidence: 'border-cyan-800/30 bg-cyan-950/10',
                ioc: 'border-purple-800/30 bg-purple-950/10',
                remediation: 'border-emerald-800/30 bg-emerald-950/10',
                todo: 'border-amber-800/30 bg-amber-950/10',
                note: 'border-slate-800/30 bg-slate-900/30',
              }
              return (
                <div key={n.id} className={`rounded-xl border p-3 ${tagColors[n.tag] || tagColors.note}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase text-slate-500">#{n.tag}</span>
                    <span className="text-xs text-slate-700">Phase {n.phase}</span>
                    <span className="text-xs text-slate-700 ml-auto">{new Date(n.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.content}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
