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

const getYForScore = (score, distribution) => {
  if (!distribution || distribution.length === 0) return 100
  const svgX = score * 5
  let closest = distribution[0]
  let minDist = Math.abs(distribution[0].x - svgX)
  for (let i = 1; i < distribution.length; i++) {
    const dist = Math.abs(distribution[i].x - svgX)
    if (dist < minDist) {
      minDist = dist
      closest = distribution[i]
    }
  }
  return closest.y
}

export default function InstructorDashboard() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [users, setUsers] = useState([])
  const [activity, setActivity] = useState([])
  const [aiUsage, setAiUsage] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ scenario: 'all', status: 'all' })
  const [lastRefresh, setLastRefresh] = useState(null)
  const [activeTab, setActiveTab] = useState('sessions') // 'sessions' | 'users' | 'analytics' | 'platform'
  const [terminating, setTerminating] = useState(null)

  // Live inspection states
  const [inspectSessionId, setInspectSessionId] = useState(null)
  const [inspectData, setInspectData] = useState(null)
  const [loadingInspect, setLoadingInspect] = useState(false)
  const [hoveredStudent, setHoveredStudent] = useState(null)

  const handleExportGrades = useCallback(async (format) => {
    try {
      const res = await api.get(`/instructor/export/grades?format=${format}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `parallax-grades-${format}-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert('Failed to export grades')
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, metricsRes, usersRes, activityRes, aiUsageRes, analyticsRes] = await Promise.all([
        api.get('/instructor/sessions'),
        api.get('/instructor/metrics'),
        api.get('/instructor/users'),
        api.get('/instructor/activity'),
        api.get('/instructor/ai/usage'),
        api.get('/instructor/analytics')
      ])
      setSessions(sessionsRes.data)
      setMetrics(metricsRes.data)
      setUsers(usersRes.data)
      setActivity(activityRes.data)
      setAiUsage(aiUsageRes.data)
      setAnalytics(analyticsRes.data)
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

  const fetchInspectData = useCallback(async (sid) => {
    setLoadingInspect(true)
    try {
      const res = await api.get(`/instructor/sessions/${sid}/live-inspect`)
      setInspectData(res.data)
    } catch {
      window.alert('Failed to load live inspection details')
      setInspectSessionId(null)
    } finally {
      setLoadingInspect(false)
    }
  }, [])

  useEffect(() => {
    if (inspectSessionId) {
      fetchInspectData(inspectSessionId)
      const interval = setInterval(() => fetchInspectData(inspectSessionId), 10_000)
      return () => clearInterval(interval)
    } else {
      setInspectData(null)
    }
  }, [inspectSessionId, fetchInspectData])

  const terminateSession = async (sessionId) => {
    if (!window.confirm('Force terminate this session? Containers will be destroyed.')) return
    setTerminating(sessionId)
    try {
      await api.post(`/instructor/sessions/${sessionId}/terminate`)
      await fetchData()
    } catch {
      window.alert('Failed to terminate session')
    } finally {
      setTerminating(null)
    }
  }

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
    link.download = `parallax-sessions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  const downloadReport = useCallback(async (sessionId) => {
    const res = await api.get(`/instructor/sessions/${sessionId}/report`, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `parallax-${sessionId}.md`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  if (loading) return <InstructorLoading />

  return (
    <div className="min-h-dvh bg-void text-txt-primary font-display">
      <header className="sticky top-0 z-40 h-14 bg-surface-1 border-b border-cs-border px-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative h-[22px] w-[22px]">
            <div className="absolute left-0 top-0 h-[9px] w-[9px] rounded-[2px] bg-cs-red shadow-red-glow" />
            <div className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-[2px] bg-cs-blue shadow-blue-glow" />
          </div>
          <span className="font-display font-bold text-txt-primary">Parallax</span>
        </div>
        <div className="h-5 w-px bg-cs-border" />
        <Badge tone="blue">Instructor</Badge>

        <div className="hidden flex-1 justify-center md:flex gap-6">
          <button onClick={() => setActiveTab('sessions')} className={`text-xs font-display normal-case transition-colors ${activeTab === 'sessions' ? 'text-cs-blue font-bold border-b-2 border-cs-blue py-4' : 'text-txt-dim hover:text-txt-primary py-4'}`}>Sessions</button>
          <button onClick={() => setActiveTab('users')} className={`text-xs font-display normal-case transition-colors ${activeTab === 'users' ? 'text-cs-blue font-bold border-b-2 border-cs-blue py-4' : 'text-txt-dim hover:text-txt-primary py-4'}`}>Users</button>
          <button onClick={() => setActiveTab('analytics')} className={`text-xs font-display normal-case transition-colors ${activeTab === 'analytics' ? 'text-cs-blue font-bold border-b-2 border-cs-blue py-4' : 'text-txt-dim hover:text-txt-primary py-4'}`}>Learning Analytics</button>
          <button onClick={() => setActiveTab('platform')} className={`text-xs font-display normal-case transition-colors ${activeTab === 'platform' ? 'text-cs-blue font-bold border-b-2 border-cs-blue py-4' : 'text-txt-dim hover:text-txt-primary py-4'}`}>Platform & AI</button>
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

        {activeTab === 'sessions' && (
          <>
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
              <span className="text-xs font-display normal-case text-txt-dim">Filter</span>
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
                <table className="w-full min-w-[960px] text-xs font-display">
                  <thead>
                    <tr className="bg-surface-2 text-[10.5px] font-display normal-case text-txt-dim border-b border-cs-border text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Scenario</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Phase</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Hints</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Started</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
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
                            <Badge tone={s.role === 'red' ? 'red' : 'blue'}>{s.role === 'red' ? 'Red' : 'Blue'}</Badge>
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
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {s.status === 'active' && (
                                <>
                                  <Button
                                    onClick={() => setInspectSessionId(s.session_id)}
                                    variant="ghost" size="sm" className="text-cs-blue hover:bg-cs-blue/10"
                                  >
                                    Inspect
                                  </Button>
                                  <Button
                                    onClick={() => terminateSession(s.session_id)}
                                    variant="ghost" size="sm" className="text-cs-red hover:bg-cs-red/10"
                                    disabled={terminating === s.session_id}
                                  >
                                    Terminate
                                  </Button>
                                </>
                              )}
                              <Button onClick={() => downloadReport(s.session_id)} variant="ghost" size="sm">
                                â†“ Report
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="card-v3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-display">
                <thead>
                  <tr className="bg-surface-2 text-[10.5px] font-display normal-case text-txt-dim border-b border-cs-border text-left">
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Skill Level</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState icon={<TableIcon />} title="No users found" />
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className="bg-transparent hover:bg-surface-2/60 transition-colors border-b border-cs-border/40">
                        <td className="px-4 py-3 text-txt-primary font-semibold">{u.username}</td>
                        <td className="px-4 py-3"><Badge tone={u.role === 'instructor' ? 'red' : 'blue'}>{u.role}</Badge></td>
                        <td className="px-4 py-3 text-txt-dim">{u.skill_level}</td>
                        <td className="px-4 py-3 text-txt-dim">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'platform' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="card-v3 p-5 border-cs-blue/30 bg-cs-blue/5">
                <h3 className="text-sm font-semibold text-cs-blue mb-4 font-display normal-case">AI Guard & Usage Monitor</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-display text-txt-dim normal-case mb-1">Global Daily Tokens</div>
                    <div className="text-2xl font-bold font-mono">{aiUsage?.global_daily_tokens_used?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-display text-txt-dim normal-case mb-1">Flagged Interactions</div>
                    <div className="text-2xl font-bold text-cs-red font-mono">{aiUsage?.total_flagged_interactions || 0}</div>
                  </div>
                </div>
              </div>

              <div className="card-v3 overflow-hidden">
                <h3 className="p-4 border-b border-cs-border text-xs font-semibold text-txt-secondary font-display normal-case">Recent Activity Feed</h3>
                <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                  {activity.map(act => (
                    <div key={act.id} className="flex gap-3 text-xs border-b border-cs-border/30 pb-3 last:border-0 last:pb-0">
                      <div className="w-20 text-txt-dim font-mono flex-shrink-0">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</div>
                      <div>
                        <span className="font-bold text-cs-blue mr-2">{act.username}</span>
                        <span className="text-txt-secondary">{act.event_type}</span>
                        {act.session_id && <span className="text-txt-dim ml-2 font-mono">({act.session_id.substring(0, 8)})</span>}
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && <div className="text-txt-dim font-mono text-xs">No recent activity.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card-v3 p-5 lg:col-span-2 relative">
                <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case">
                  Cohort Performance Distribution
                </h3>
                <div className="h-48 w-full bg-void rounded-cs-md border border-cs-border/40 p-4 relative">
                  {analytics.score_distribution && (
                    <div className="w-full h-full relative">
                      <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="kde-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="90" x2="500" y2="90" className="stroke-cs-border/40" strokeWidth="1" />
                        <line x1="0" y1="50" x2="500" y2="50" className="stroke-cs-border/20" strokeWidth="1" strokeDasharray="3" />
                        <line x1="0" y1="10" x2="500" y2="10" className="stroke-cs-border/20" strokeWidth="1" strokeDasharray="3" />
                        <path
                          d={`M 0 90 L ${analytics.score_distribution.map(p => `${p.x} ${p.y * 0.9}`).join(' L ')} L 500 90 Z`}
                          fill="url(#kde-grad)"
                        />
                        <path
                          d={`M ${analytics.score_distribution.map(p => `${p.x} ${p.y * 0.9}`).join(' L ')}`}
                          fill="none"
                          stroke="#00d2ff"
                          strokeWidth="2"
                        />
                        {sessions.map((s) => {
                          const x = s.score * 5;
                          const y = getYForScore(s.score, analytics.score_distribution) * 0.9;
                          return (
                            <circle
                              key={s.session_id}
                              cx={x}
                              cy={y}
                              r="4.5"
                              className="fill-cs-blue hover:fill-txt-primary cursor-pointer transition-colors stroke-surface-1 stroke-2"
                              onMouseEnter={() => setHoveredStudent(s)}
                              onMouseLeave={() => setHoveredStudent(null)}
                            />
                          );
                        })}
                      </svg>
                    </div>
                  )}
                  {hoveredStudent && (
                    <div className="absolute top-2 right-2 bg-surface-2 border border-cs-border/80 px-3 py-2 rounded-cs-md text-xs font-mono shadow-xl z-10">
                      <div className="font-bold text-cs-blue">{hoveredStudent.username}</div>
                      <div>Score: <span className="text-green-signal font-bold">{hoveredStudent.score}pts</span></div>
                      <div>Scenario: <span className="text-txt-secondary">{hoveredStudent.scenario_id}</span></div>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-mono text-txt-dim px-2">
                  <span>Score: 0</span>
                  <span>50 (Average)</span>
                  <span>100 (Max)</span>
                </div>
              </div>

              <div className="card-v3 p-5">
                <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case">
                  Methodology Gaps
                </h3>
                <div className="space-y-4">
                  {analytics.methodology_gaps.length === 0 ? (
                    <div className="text-txt-dim font-mono text-xs h-40 flex items-center justify-center">
                      No gaps detected.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analytics.methodology_gaps.slice(0, 5).map((gap, i) => {
                        const maxVal = Math.max(...analytics.methodology_gaps.map(g => g.blocks_triggered), 1);
                        const percent = (gap.blocks_triggered / maxVal) * 100;
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-txt-secondary font-semibold">{gap.tool}</span>
                              <span className="text-cs-red font-bold">{gap.blocks_triggered} blocks</span>
                            </div>
                            <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                              <div className="h-full rounded-full bg-cs-red/80" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card-v3 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case">
                  Struggle Flags Warning Deck
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {analytics.struggle_flags.length === 0 ? (
                    <div className="col-span-2 text-txt-dim font-mono text-xs h-32 flex items-center justify-center border border-dashed border-cs-border/40 rounded-cs-md">
                      No struggling students detected.
                    </div>
                  ) : (
                    analytics.struggle_flags.map((flag, idx) => (
                      <div key={idx} className="bg-surface-2/60 border border-cs-red/20 hover:border-cs-red/40 rounded-cs-md p-4 flex flex-col justify-between transition-colors">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-txt-primary font-bold font-mono">{flag.username}</span>
                            <Badge tone="red">Struggle: {flag.struggle_score}</Badge>
                          </div>
                          <div className="text-[10px] text-txt-dim font-mono mb-2">
                            Scenario: {flag.scenario_id} | Phase: {flag.phase} | Score: {flag.score}
                          </div>
                          <div className="space-y-1">
                            {flag.reasons.map((r, ri) => (
                              <div key={ri} className="text-[11px] text-cs-red/90 flex items-start gap-1 font-mono">
                                <span className="text-[10px]">âš ï¸</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 pt-2 border-t border-cs-border/20 flex justify-end">
                          <Button
                            onClick={() => setInspectSessionId(flag.session_id)}
                            variant="subtle"
                            size="sm"
                            className="bg-cs-red/10 border-cs-red/30 hover:bg-cs-red/20 text-cs-red font-mono text-[10px]"
                          >
                            Inspect Live
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card-v3 p-5">
                <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case">
                  Hint Heat Grid
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-txt-dim text-center font-bold">
                    <div>Phase</div>
                    <div>L1</div>
                    <div>L2</div>
                    <div>L3</div>
                  </div>
                  {Array.from({ length: 6 }).map((_, pi) => {
                    const phaseNum = pi + 1;
                    const maxVal = Math.max(
                      ...Object.values(analytics.hint_grid || {}).flatMap(lvlObj => Object.values(lvlObj || {})),
                      1
                    );
                    return (
                      <div key={pi} className="grid grid-cols-4 gap-1 text-center items-center">
                        <div className="text-[11px] font-mono text-txt-secondary text-left font-semibold">P{phaseNum}</div>
                        {[1, 2, 3].map((lvl) => {
                          const count = analytics.hint_grid?.[phaseNum]?.[lvl] || 0;
                          const intensity = count / maxVal;
                          const bgStyle = count > 0 ? { backgroundColor: `hsla(200, 80%, 45%, ${0.15 + intensity * 0.85})` } : { backgroundColor: 'var(--color-surface-3)' };
                          return (
                            <div
                              key={lvl}
                              style={bgStyle}
                              className={`py-1.5 rounded text-xs font-mono font-bold transition-all hover:scale-[1.05] ${count > 0 ? 'text-txt-primary shadow-sm' : 'text-txt-dim/40'}`}
                              title={`Phase ${phaseNum} Level ${lvl} Hints: ${count}`}
                            >
                              {count}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card-v3 p-5 border-cs-blue/30 bg-cs-blue/5">
              <h3 className="text-sm font-semibold text-cs-blue mb-2 font-display normal-case">
                Classroom Gradebook Export
              </h3>
              <p className="text-xs text-txt-dim mb-4">
                Download grade CSV templates formatted exactly for Canvas or Moodle import formats.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => handleExportGrades('canvas')} variant="subtle" className="font-mono text-xs">
                  Export Canvas CSV (Default)
                </Button>
                <Button onClick={() => handleExportGrades('moodle')} variant="subtle" className="font-mono text-xs">
                  Export Moodle CSV
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {inspectSessionId && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-surface-1 border-l border-cs-border shadow-2xl z-50 flex flex-col transition-transform duration-300">
          <div className="p-4 border-b border-cs-border flex justify-between items-center bg-surface-2">
            <div>
              <h3 className="text-sm font-bold font-display text-cs-blue normal-case">Live Session Inspector</h3>
              <p className="text-[10px] text-txt-dim font-mono">Session: {inspectSessionId.substring(0, 8)}</p>
            </div>
            <button onClick={() => setInspectSessionId(null)} className="text-txt-dim hover:text-txt-primary font-display normal-case text-sm">Close</button>
          </div>
          {loadingInspect ? (
            <div className="flex-1 flex items-center justify-center font-mono text-xs text-txt-dim">Loading live telemetry...</div>
          ) : inspectData ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-void p-3 rounded-cs-md border border-cs-border/40">
                <div>Student: <span className="text-txt-primary font-bold">{inspectData.session?.username}</span></div>
                <div>Score: <span className="text-green-signal font-bold">{inspectData.session?.score} pts</span></div>
                <div>Scenario: <span className="text-cs-blue">{inspectData.session?.scenario_id}</span></div>
                <div>Phase: <span className="text-txt-secondary">{inspectData.session?.phase}</span></div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-[10px] font-display text-txt-dim normal-case">Terminal Commands Log ({inspectData.commands?.length || 0})</h4>
                <div className="bg-void p-3 rounded-cs-md border border-cs-border/40 max-h-[180px] overflow-y-auto font-mono text-[11px] space-y-1.5 scrollbar-thin">
                  {inspectData.commands?.map((c, i) => (
                    <div key={i} className="flex justify-between hover:bg-surface-3/30 p-1 rounded">
                      <span className="text-txt-primary break-all">{c.command}</span>
                      <span className="text-[10px] text-txt-dim flex-shrink-0 ml-2">{new Date(c.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {(!inspectData.commands || inspectData.commands.length === 0) && <div className="text-txt-dim">No commands run yet.</div>}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-display text-txt-dim normal-case">Student Notebook Notes ({inspectData.notes?.length || 0})</h4>
                <div className="bg-void p-3 rounded-cs-md border border-cs-border/40 max-h-[150px] overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-thin">
                  {inspectData.notes?.map((n, i) => (
                    <div key={i} className="border-b border-cs-border/20 pb-2 last:border-0 last:pb-0 font-mono">
                      <div className="flex justify-between items-center mb-1">
                        <Badge tone={n.tag === '#finding' ? 'red' : 'blue'}>{n.tag}</Badge>
                        <span className="text-[10px] text-txt-dim">Phase {n.phase}</span>
                      </div>
                      <div className="text-txt-secondary italic">{n.content}</div>
                    </div>
                  ))}
                  {(!inspectData.notes || inspectData.notes.length === 0) && <div className="text-txt-dim">No notes recorded yet.</div>}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-display text-txt-dim normal-case">SIEM Detections ({inspectData.events?.length || 0})</h4>
                <div className="bg-void p-3 rounded-cs-md border border-cs-border/40 max-h-[220px] overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-thin">
                  {inspectData.events?.map((e, i) => (
                    <div key={i} className="border-b border-cs-border/20 pb-2 last:border-0 last:pb-0 flex flex-col gap-0.5 font-mono">
                      <div className="flex justify-between items-center">
                        <Badge tone={e.severity === 'critical' || e.severity === 'high' ? 'red' : e.severity === 'medium' ? 'amber' : 'neutral'}>{e.severity}</Badge>
                        <span className="text-[9px] text-txt-dim">{new Date(e.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-txt-primary">{e.message}</div>
                      <div className="flex justify-between text-[9px] text-txt-dim mt-0.5">
                        <span>Source: {e.source}</span>
                        <span className={e.classification ? 'text-green-signal font-bold' : 'text-cs-red font-semibold'}>
                          {e.classification ? `Triage: ${e.classification}` : 'Untriaged'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!inspectData.events || inspectData.events.length === 0) && <div className="text-txt-dim">No SIEM events generated yet.</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center font-mono text-xs text-txt-dim">Failed to load inspection data.</div>
          )}
        </div>
      )}
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
    <div className="min-h-dvh bg-void flex items-center justify-center">
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
