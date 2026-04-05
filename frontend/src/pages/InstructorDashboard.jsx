import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const SCENARIO_LABELS = {
  'SC-01': 'NovaMed Web Pentest',
  'SC-02': 'Nexora AD Compromise',
  'SC-03': 'Orion Phishing',
}

const SEVERITY_COLOR = (score) => {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
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

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">
      Loading instructor data...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-blue-400 text-sm font-semibold tracking-wide">INSTRUCTOR DASHBOARD</span>
        </div>
        <div className="h-4 w-px bg-gray-700" />
        <span className="text-gray-500 text-xs font-mono">CyberSim v2.0</span>
        <div className="ml-auto flex items-center gap-4">
          {lastRefresh && (
            <span className="text-gray-600 text-xs">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="text-xs px-3 py-1 border border-gray-700 text-gray-400 hover:text-gray-200 rounded transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-xs px-3 py-1 border border-gray-700 text-gray-400 hover:text-gray-200 rounded transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Metrics row */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total sessions" value={metrics.total_sessions} />
            <MetricCard label="Active now" value={metrics.active_sessions} highlight />
            <MetricCard label="Avg score" value={`${metrics.avg_score}pts`} />
            <MetricCard label="SIEM events" value={metrics.total_siem_events} />
          </div>
        )}

        {/* Scenario breakdown */}
        {metrics?.by_scenario?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">By scenario</h3>
            <div className="flex gap-6">
              {metrics.by_scenario.map(s => (
                <div key={s.scenario_id} className="text-center">
                  <div className="text-xs text-gray-400 font-mono">{s.scenario_id}</div>
                  <div className="text-white text-lg font-semibold">{s.session_count}</div>
                  <div className="text-xs text-gray-600">sessions · avg {s.avg_score}pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <span className="text-gray-600 text-xs">Filter:</span>
          <select
            value={filter.scenario}
            onChange={e => setFilter(f => ({ ...f, scenario: e.target.value }))}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none"
          >
            <option value="all">All scenarios</option>
            <option value="SC-01">SC-01 NovaMed</option>
            <option value="SC-02">SC-02 Nexora</option>
            <option value="SC-03">SC-03 Orion</option>
          </select>
          <select
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <span className="text-gray-600 text-xs ml-auto">{filtered.length} sessions</span>
        </div>

        {/* Sessions table */}
        <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="px-4 py-2.5 font-medium">Student</th>
                <th className="px-4 py-2.5 font-medium">Scenario</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Phase</th>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Hints</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-700">
                    No sessions found
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.session_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-200">{s.username}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-gray-400">{s.scenario_id}</span>
                      <span className="text-gray-600 ml-1.5">{SCENARIO_LABELS[s.scenario_id]}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        s.role === 'red'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-teal-950 text-teal-400 border border-teal-800'
                      }`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300 font-mono">{s.phase}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold font-mono ${SEVERITY_COLOR(s.score)}`}>
                        {s.score}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono">{s.hints_used}</td>
                    <td className="px-4 py-2.5">
                      {s.status === 'active' ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-green-400">active</span>
                        </span>
                      ) : (
                        <span className="text-gray-600">completed</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono">
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, highlight = false }) {
  return (
    <div className={`bg-gray-900 border rounded p-4 ${highlight ? 'border-blue-800' : 'border-gray-800'}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold font-mono ${highlight ? 'text-blue-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}
