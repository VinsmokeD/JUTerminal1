import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Badge, Button, EmptyState, LiveIndicator, Stat } from '../components/ui'

const SCENARIOS = [
  { id: 'SC-01', short: 'NovaMed', name: 'NovaMed Healthcare Web App', tone: 'red' },
  { id: 'SC-02', short: 'Nexora', name: 'Nexora Financial Active Directory', tone: 'blue' },
  { id: 'SC-03', short: 'Orion', name: 'Orion Logistics Phishing', tone: 'amber' },
]

const SCENARIO_LABELS = Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenario.name]))
const SCENARIO_TONES = Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenario.tone]))

const scoreTextClass = (score) => {
  if (score >= 80) return 'text-green-signal'
  if (score >= 60) return 'text-amber-warn'
  return 'text-cs-red'
}

const progressClass = (score) => {
  if (score >= 80) return 'bg-green-signal'
  if (score >= 60) return 'bg-cs-blue'
  return 'bg-amber-warn'
}

const csvEscape = (value) => {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export default function InstructorDashboard() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ scenario: 'all', status: 'all' })
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, metricsRes] = await Promise.all([
        api.get('/instructor/sessions'),
        api.get('/instructor/metrics'),
      ])
      setSessions(sessionsRes.data)
      setMetrics(metricsRes.data)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/')
      } else {
        setError('Failed to load instructor data')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filtered = sessions.filter(s => {
    if (filter.scenario !== 'all' && s.scenario_id !== filter.scenario) return false
    if (filter.status !== 'all' && s.status !== filter.status) return false
    return true
  })

  const hasFilter = filter.scenario !== 'all' || filter.status !== 'all'

  const exportCsv = useCallback(() => {
    const headers = ['Student', 'Scenario', 'Role', 'Phase', 'Score', 'Hints', 'Status', 'Started', 'Session ID']
    const rows = filtered.map(s => [
      s.username,
      s.scenario_id,
      s.role,
      s.phase,
      s.score,
      s.hints_used,
      s.status,
      s.started_at,
      s.session_id,
    ])
    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cybersim-sessions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  const downloadReport = useCallback(async (sessionId) => {
    const res = await api.get(`/instructor/sessions/${sessionId}/report`, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cybersim-${sessionId}.md`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  if (loading) return <InstructorLoading />

  return (
    <div className="min-h-screen bg-void text-txt-primary font-display">
      <header className="sticky top-0 z-40 h-14 bg-surface-1 border-b border-cs-border px-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative h-[22px] w-[22px]">
            <div className="absolute left-0 top-0 h-[9px] w-[9px] rounded-[2px] bg-cs-red shadow-red-glow" />
            <div className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-[2px] bg-cs-blue shadow-blue-glow" />
          </div>
          <span className="font-display font-bold text-txt-primary">CyberSim</span>
        </div>
        <div className="h-5 w-px bg-cs-border" />
        <Badge tone="blue">Instructor</Badge>

        <div className="hidden flex-1 justify-center md:flex">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-txt-dim">Operations Center</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LiveIndicator />
          {lastRefresh && (
            <span className="hidden text-xs font-mono text-txt-dim sm:inline">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchData} variant="ghost" size="sm">Refresh</Button>
          <Button onClick={exportCsv} variant="subtle" size="sm">Export CSV</Button>
          <Button onClick={() => navigate('/')} variant="ghost" size="sm">Back</Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {error && (
          <div className="card-v3 flex items-center gap-3 border-cs-red/30 bg-cs-red/5 px-4 py-3">
            <Badge tone="red">Error</Badge>
            <span className="text-sm text-cs-red">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-cs-sm text-cs-red hover:bg-cs-red/10"
              aria-label="Dismiss error"
            >
              X
            </button>
          </div>
        )}

        {metrics && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total sessions" value={metrics.total_sessions} accent="neutral" trend={<Sparkline tone="blue" />} />
            <Stat
              label="Active now"
              value={<span className="inline-flex items-center gap-2">{metrics.active_sessions}<span className="h-2 w-2 rounded-full bg-green-signal shadow-[0_0_8px_#00ff88] animate-pulse" /></span>}
              accent="green"
              trend={<Sparkline tone="green" />}
            />
            <Stat label="Avg score" value={`${metrics.avg_score}pts`} accent="blue" trend={<Sparkline tone="blue" />} />
            <Stat label="SIEM events" value={metrics.total_siem_events} accent="red" trend={<Sparkline tone="red" />} />
          </div>
        )}

        {metrics && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {SCENARIOS.map((scenario) => {
              const row = metrics.by_scenario?.find((item) => item.scenario_id === scenario.id)
              const count = row?.session_count ?? 0
              const avg = Math.round(row?.avg_score ?? 0)
              return (
                <div key={scenario.id} className="card-v3 p-5">
                  <div className="flex items-center justify-between">
                    <Badge tone={scenario.tone}>{scenario.id}</Badge>
                    <span className="text-xs text-txt-dim font-mono">{count} sessions</span>
                  </div>
                  <p className="mt-2 text-xs text-txt-dim">{scenario.name}</p>
                  <div className="mt-5 text-3xl font-mono font-bold text-txt-primary">{count}</div>
                  <div className="mt-4 h-2 rounded-full bg-surface-3 overflow-hidden">
                    <div className={`h-full rounded-full ${progressClass(avg)}`} style={{ width: `${Math.max(0, Math.min(100, avg))}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-txt-dim font-mono">
                    <span>avg score</span>
                    <span>{avg}pts</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="card-v3 flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-xs font-mono uppercase tracking-[0.12em] text-txt-dim">Filter</span>
          <select
            value={filter.scenario}
            onChange={e => setFilter(f => ({ ...f, scenario: e.target.value }))}
            className="input max-w-[190px] text-xs font-mono"
          >
            <option value="all">All scenarios</option>
            <option value="SC-01">SC-01 NovaMed</option>
            <option value="SC-02">SC-02 Nexora</option>
            <option value="SC-03">SC-03 Orion</option>
          </select>
          <select
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="input max-w-[170px] text-xs font-mono"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          {hasFilter && (
            <Button onClick={() => setFilter({ scenario: 'all', status: 'all' })} variant="ghost" size="sm">
              Clear filters
            </Button>
          )}
          <div className="ml-auto">
            <Badge tone="neutral">{filtered.length} sessions</Badge>
          </div>
        </div>

        <div className="card-v3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs font-mono">
              <thead>
                <tr className="bg-surface-2 text-[10.5px] font-mono uppercase tracking-[0.12em] text-txt-dim border-b border-cs-border text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Scenario</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Hints</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Report</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState icon={<TableIcon />} title="No sessions match filters" />
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <tr key={s.session_id} className="bg-transparent hover:bg-surface-2/60 transition-colors border-b border-cs-border/40">
                      <td className="px-4 py-3 text-txt-primary font-semibold">{s.username}</td>
                      <td className="px-4 py-3">
                        <Badge tone={SCENARIO_TONES[s.scenario_id] || 'neutral'}>{s.scenario_id}</Badge>
                        <span className="text-txt-dim text-[10px] ml-1.5">{SCENARIO_LABELS[s.scenario_id]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.role === 'red' ? 'red' : 'blue'}>{s.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-txt-secondary">{s.phase}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${scoreTextClass(s.score)}`}>{s.score}</span>
                        <div className="mt-1 h-1 w-10 rounded-full bg-surface-3 overflow-hidden">
                          <div className={`h-full rounded-full ${progressClass(s.score)}`} style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-txt-dim">{s.hints_used}</td>
                      <td className="px-4 py-3">
                        {s.status === 'active' ? (
                          <LiveIndicator label="active" />
                        ) : (
                          <span className="text-txt-dim">done</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-txt-dim">
                        {new Date(s.started_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button onClick={() => downloadReport(s.session_id)} variant="ghost" size="sm">
                          ↓ Report
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function Sparkline({ tone = 'blue' }) {
  const bg = {
    blue: 'bg-cs-blue/30',
    red: 'bg-cs-red/30',
    green: 'bg-green-signal/30',
  }[tone] || 'bg-cs-blue/30'
  return (
    <div className="mt-1 flex h-6 items-end gap-1">
      {[35, 62, 45, 78, 58].map((height, index) => (
        <span key={index} className={`w-2 rounded-sm ${bg}`} style={{ height: `${height}%` }} />
      ))}
    </div>
  )
}

function InstructorLoading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <style>{`
        @keyframes instructorLogoA { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.9); } }
        @keyframes instructorLogoB { 0%, 100% { opacity: 0.55; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes instructorDot { 0%, 80%, 100% { transform: translateY(0); opacity: 0.45; } 40% { transform: translateY(-5px); opacity: 1; } }
      `}</style>
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute left-0 top-0 h-6 w-6 rounded bg-cs-red shadow-red-glow" style={{ animation: 'instructorLogoA 1.4s ease-in-out infinite' }} />
          <div className="absolute bottom-0 right-0 h-6 w-6 rounded bg-cs-blue shadow-blue-glow" style={{ animation: 'instructorLogoB 1.4s ease-in-out infinite' }} />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-cs-blue"
              style={{ animation: `instructorDot 900ms ease-in-out ${index * 120}ms infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TableIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5M8.25 5.25v13.5m7.5-13.5v13.5" />
    </svg>
  )
}
