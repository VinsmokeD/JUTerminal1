import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

const DIFFICULTY_COLOR = {
  Intermediate: 'text-yellow-400 bg-yellow-900 border-yellow-700',
  Advanced: 'text-red-400 bg-red-900 border-red-700',
  Beginner: 'text-green-400 bg-green-900 border-green-700',
}

const METHODOLOGY_OPTIONS = [
  { value: 'ptes', label: 'PTES', desc: 'Penetration Testing Execution Standard' },
  { value: 'owasp', label: 'OWASP', desc: 'OWASP Testing Guide v4.2' },
  { value: 'issaf', label: 'ISSAF', desc: 'Information Systems Security Assessment Framework' },
  { value: 'custom', label: 'Custom', desc: 'Your own approach — platform adapts to you' },
]

export default function Dashboard() {
  const { scenarios, fetchScenarios, startSession } = useSessionStore()
  const { username, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mySessions, setMySessions] = useState([])
  const [launching, setLaunching] = useState(null)
  const [launchModal, setLaunchModal] = useState(null) // { scenario }
  const [role, setRole] = useState('red')
  const [methodology, setMethodology] = useState('ptes')
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    fetchScenarios()
    api.get('/sessions/').then(r => setMySessions(r.data)).catch(() => {})
    api.get('/auth/me').then(r => setUserRole(r.data.role)).catch(() => {})
  }, [fetchScenarios])

  const launch = async () => {
    if (!launchModal) return
    setLaunching(launchModal.id)
    try {
      const session = await startSession(launchModal.id, role, methodology)
      navigate(`/session/${session.id}/${role}`)
    } catch (e) {
      alert('Failed to start session: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLaunching(null)
      setLaunchModal(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-mono text-xs font-bold">CS</div>
          <span className="font-semibold text-sm">CyberSim</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{username}</span>
          {userRole === 'instructor' && (
            <button onClick={() => navigate('/instructor')} className="text-blue-400 hover:text-blue-300 text-sm">
              Instructor Dashboard
            </button>
          )}
          <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-sm">Sign out</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white mb-1">Training Scenarios</h1>
          <p className="text-gray-400 text-sm">Select a scenario, choose your role, and declare your methodology before starting.</p>
        </div>

        {/* Scenario cards */}
        <div className="grid gap-4">
          {scenarios.map(sc => (
            <div key={sc.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-xs text-blue-400 bg-blue-950 border border-blue-800 px-2 py-0.5 rounded">{sc.id}</span>
                    <span className={`text-xs border px-2 py-0.5 rounded ${DIFFICULTY_COLOR[sc.difficulty] || 'text-gray-400'}`}>{sc.difficulty}</span>
                    <span className="text-xs text-gray-500">{sc.duration_hours}h</span>
                  </div>
                  <h3 className="font-medium text-white text-sm mb-1">{sc.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{sc.description}</p>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {sc.frameworks.map(f => (
                      <span key={f} className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setLaunchModal(sc)}
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                  Launch
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent sessions */}
        {mySessions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Recent sessions</h2>
            <div className="space-y-2">
              {mySessions.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-xs">
                  <span className="font-mono text-blue-400">{s.scenario_id}</span>
                  <span className={`px-2 py-0.5 rounded border ${s.role === 'red' ? 'text-red-400 bg-red-950 border-red-800' : 'text-teal-400 bg-teal-950 border-teal-800'}`}>{s.role}</span>
                  <span className="text-gray-500">Phase {s.phase}</span>
                  <span className="text-yellow-400">Score: {s.score}</span>
                  <span className="text-gray-600">{new Date(s.started_at).toLocaleDateString()}</span>
                  {!s.completed_at && (
                    <button onClick={() => navigate(`/session/${s.id}/${s.role}`)}
                      className="text-blue-400 hover:text-blue-300">Resume →</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Launch modal */}
      {launchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6">
            <h2 className="font-semibold text-white mb-1">{launchModal.id}</h2>
            <p className="text-gray-400 text-sm mb-5">{launchModal.title}</p>

            <div className="mb-5">
              <label className="block text-xs text-gray-400 mb-2">Your role</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'red', label: 'Red team', desc: 'Attacker — pentest', color: 'red' },
                  { v: 'blue', label: 'Blue team', desc: 'Defender — SOC/IR', color: 'teal' },
                ].map(r => (
                  <button key={r.v} onClick={() => setRole(r.v)}
                    className={`p-3 rounded border text-left transition-colors ${role === r.v
                      ? r.color === 'red' ? 'border-red-600 bg-red-950' : 'border-teal-600 bg-teal-950'
                      : 'border-gray-700 hover:border-gray-600'}`}>
                    <div className={`text-sm font-medium ${r.color === 'red' ? 'text-red-400' : 'text-teal-400'}`}>{r.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-2">Methodology</label>
              <div className="space-y-2">
                {METHODOLOGY_OPTIONS.map(m => (
                  <button key={m.value} onClick={() => setMethodology(m.value)}
                    className={`w-full p-2.5 rounded border text-left transition-colors flex items-center gap-3 ${methodology === m.value ? 'border-blue-600 bg-blue-950' : 'border-gray-700 hover:border-gray-600'}`}>
                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${methodology === m.value ? 'border-blue-400 bg-blue-400' : 'border-gray-600'}`} />
                    <div>
                      <div className="text-sm text-white">{m.label}</div>
                      <div className="text-xs text-gray-500">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setLaunchModal(null)} className="flex-1 py-2 rounded border border-gray-700 text-gray-400 hover:text-gray-300 text-sm transition-colors">Cancel</button>
              <button onClick={launch} disabled={!!launching}
                className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium transition-colors">
                {launching ? 'Starting...' : 'Start session →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
