import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

const DIFFICULTY_STYLE = {
  Intermediate: { text: 'text-amber-400', bg: 'bg-amber-950/50 border-amber-800/50' },
  Advanced: { text: 'text-rose-400', bg: 'bg-rose-950/50 border-rose-800/50' },
  Beginner: { text: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-800/50' },
}

const SCENARIO_IMAGES = {
  'SC-01': { gradient: 'from-rose-600/20 to-orange-600/20', icon: 'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418' },
  'SC-02': { gradient: 'from-blue-600/20 to-purple-600/20', icon: 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
  'SC-03': { gradient: 'from-amber-600/20 to-red-600/20', icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75' },
}

const METHODOLOGY_OPTIONS = [
  { value: 'ptes', label: 'PTES', desc: 'Penetration Testing Execution Standard — the industry-standard methodology for structured pentesting' },
  { value: 'owasp', label: 'OWASP', desc: 'OWASP Testing Guide — focused on web application security testing with specific test case IDs' },
  { value: 'issaf', label: 'ISSAF', desc: 'Information Systems Security Assessment Framework — comprehensive assessment methodology' },
  { value: 'custom', label: 'Custom', desc: "Your own approach — the platform adapts to you but won't enforce phase gates" },
]

const NETWORK_DIAGRAMS = {
  'SC-01': [
    { ip: '172.20.1.1', label: 'ModSecurity WAF', type: 'defense' },
    { ip: '172.20.1.20', label: 'PHP/Apache webapp', type: 'target' },
    { ip: '172.20.1.21', label: 'MySQL Database', type: 'data' },
  ],
  'SC-02': [
    { ip: '172.20.2.20', label: 'AD Domain Controller', type: 'target' },
    { ip: '172.20.2.40', label: 'File Server', type: 'data' },
  ],
  'SC-03': [
    { ip: '172.20.3.40', label: 'GoPhish Server', type: 'tool' },
    { ip: '172.20.3.20', label: 'Postfix Mail', type: 'target' },
    { ip: '172.20.3.30', label: 'Windows Endpoint', type: 'data' },
  ],
}

const LEARN_POINTS = {
  'SC-01': ['OWASP Top 10 vulnerabilities', 'SQL injection techniques', 'Local File Inclusion (LFI)', 'File upload exploitation', 'WAF detection and log analysis'],
  'SC-02': ['Active Directory reconnaissance', 'Kerberoasting attacks', 'Lateral movement techniques', 'Event log analysis (4769, 4624)', 'Credential-based attacks'],
  'SC-03': ['Social engineering fundamentals', 'Phishing campaign management', 'Email header analysis', 'SPF/DKIM/DMARC validation', 'Macro-based payload delivery'],
}

export default function Dashboard() {
  const { scenarios, fetchScenarios, startSession } = useSessionStore()
  const { username, logout, skillLevel } = useAuthStore()
  const navigate = useNavigate()
  const [mySessions, setMySessions] = useState([])
  const [launching, setLaunching] = useState(null)
  const [briefing, setBriefing] = useState(null)
  const [role, setRole] = useState('red')
  const [methodology, setMethodology] = useState('ptes')
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    fetchScenarios()
    api.get('/sessions/').then(r => setMySessions(r.data)).catch(() => {})
    api.get('/auth/me').then(r => setUserRole(r.data.role)).catch(() => {})
  }, [fetchScenarios])

  const launch = async () => {
    if (!briefing) return
    setLaunching(briefing.id)
    try {
      const session = await startSession(briefing.id, role, methodology)
      navigate(`/session/${session.id}/${role}`)
    } catch (e) {
      alert('Failed to start session: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLaunching(null)
      setBriefing(null)
    }
  }

  const isBeginner = skillLevel === 'beginner'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="font-bold text-white">CyberSim</span>
            <span className="text-xs text-slate-600 font-mono hidden sm:inline">Training Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs text-cyan-400 font-semibold">
                {username?.[0]?.toUpperCase()}
              </div>
              <span className="text-slate-400 text-sm hidden sm:inline">{username}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              skillLevel === 'beginner' ? 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30' :
              skillLevel === 'intermediate' ? 'text-amber-400 border-amber-800/50 bg-amber-950/30' :
              'text-rose-400 border-rose-800/50 bg-rose-950/30'
            }`}>{skillLevel}</span>
            {userRole === 'instructor' && (
              <button onClick={() => navigate('/instructor')} className="text-cyan-400 hover:text-cyan-300 text-sm">
                Instructor
              </button>
            )}
            <button onClick={logout} className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-white mb-2">Training Scenarios</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            {isBeginner
              ? 'Choose a scenario to begin your training. Each one teaches different cybersecurity skills through hands-on practice in a safe, sandboxed environment.'
              : 'Select a scenario, choose your role and methodology, then launch your session.'}
          </p>
        </div>

        {/* Active sessions banner */}
        {mySessions.filter(s => !s.completed_at).length > 0 && (
          <div className="mb-8 p-4 rounded-xl border border-cyan-800/30 bg-cyan-950/10">
            <h3 className="text-sm font-medium text-cyan-400 mb-3">Active Sessions</h3>
            <div className="flex gap-3 flex-wrap">
              {mySessions.filter(s => !s.completed_at).slice(0, 3).map(s => (
                <button key={s.id} onClick={() => navigate(`/session/${s.id}/${s.role}`)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:border-cyan-800/50 transition-colors">
                  <span className="font-mono text-xs text-cyan-400">{s.scenario_id}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${s.role === 'red' ? 'text-rose-400 bg-rose-950/50' : 'text-teal-400 bg-teal-950/50'}`}>{s.role}</span>
                  <span className="text-slate-500 text-xs">Phase {s.phase}</span>
                  <span className="text-cyan-400 text-xs font-medium">Resume</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scenario cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {scenarios.map(sc => {
            const img = SCENARIO_IMAGES[sc.id] || SCENARIO_IMAGES['SC-01']
            const diff = DIFFICULTY_STYLE[sc.difficulty] || DIFFICULTY_STYLE.Intermediate
            const learns = LEARN_POINTS[sc.id] || []
            return (
              <div key={sc.id} className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden hover:border-slate-700/50 transition-all group">
                {/* Card header with gradient */}
                <div className={`h-32 bg-gradient-to-br ${img.gradient} flex items-center justify-center relative`}>
                  <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={img.icon} />
                  </svg>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="font-mono text-xs text-white/80 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded">{sc.id}</span>
                    <span className={`text-xs border px-2 py-0.5 rounded ${diff.bg} ${diff.text}`}>{sc.difficulty}</span>
                  </div>
                  <div className="absolute top-3 right-3 text-xs text-white/60 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded">
                    {sc.duration_hours}h
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-white mb-1.5">{sc.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">{sc.description}</p>

                  {/* What you'll learn */}
                  {isBeginner && learns.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 font-medium mb-2">What you'll learn:</p>
                      <div className="space-y-1">
                        {learns.slice(0, 3).map(l => (
                          <div key={l} className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="w-1 h-1 rounded-full bg-cyan-500" />
                            {l}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frameworks */}
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {sc.frameworks?.map(f => (
                      <span key={f} className="text-xs text-slate-500 bg-slate-800/50 border border-slate-800 px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>

                  <button
                    onClick={() => setBriefing(sc)}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/10">
                    {isBeginner ? 'View briefing' : 'Launch'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent completed sessions */}
        {mySessions.filter(s => s.completed_at).length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-medium text-slate-500 mb-3">Completed Sessions</h2>
            <div className="space-y-2">
              {mySessions.filter(s => s.completed_at).slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between bg-slate-900/30 border border-slate-800/30 rounded-lg px-4 py-3 text-xs">
                  <span className="font-mono text-cyan-400">{s.scenario_id}</span>
                  <span className={`px-2 py-0.5 rounded ${s.role === 'red' ? 'text-rose-400 bg-rose-950/30' : 'text-teal-400 bg-teal-950/30'}`}>{s.role}</span>
                  <span className="text-slate-500">Phase {s.phase}</span>
                  <span className="text-amber-400 font-medium">Score: {s.score}</span>
                  <span className="text-slate-600">{new Date(s.started_at).toLocaleDateString()}</span>
                  <button onClick={() => navigate(`/session/${s.id}/debrief`)} className="text-cyan-400 hover:text-cyan-300">View report</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mission Briefing Modal */}
      {briefing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className={`p-6 bg-gradient-to-br ${(SCENARIO_IMAGES[briefing.id] || SCENARIO_IMAGES['SC-01']).gradient} border-b border-slate-800/50`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-white/80 bg-black/30 px-2 py-0.5 rounded">{briefing.id}</span>
                <span className="text-xs text-slate-400">Mission Briefing</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{briefing.title}</h2>
              <p className="text-slate-300 text-sm">{briefing.description}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Network diagram */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Target Network</h3>
                <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-3 font-mono">Network: {NETWORK_DIAGRAMS[briefing.id] ? briefing.id === 'SC-01' ? '172.20.1.0/24' : briefing.id === 'SC-02' ? '172.20.2.0/24' : '172.20.3.0/24' : '—'}</p>
                  <div className="space-y-2">
                    {(NETWORK_DIAGRAMS[briefing.id] || []).map(h => (
                      <div key={h.ip} className="flex items-center gap-3 text-xs">
                        <code className="text-emerald-400 font-mono bg-emerald-950/30 px-2 py-1 rounded">{h.ip}</code>
                        <span className="text-slate-300">{h.label}</span>
                        <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${
                          h.type === 'target' ? 'text-rose-400 bg-rose-950/30' :
                          h.type === 'defense' ? 'text-teal-400 bg-teal-950/30' :
                          h.type === 'tool' ? 'text-cyan-400 bg-cyan-950/30' :
                          'text-amber-400 bg-amber-950/30'
                        }`}>{h.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* What you'll learn (beginner) */}
              {isBeginner && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">What you'll learn</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(LEARN_POINTS[briefing.id] || []).map(l => (
                      <div key={l} className="flex items-center gap-2 text-xs text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role selection */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  Your role
                  {isBeginner && <span className="text-xs text-slate-600 ml-2">(Red Team recommended for your first time)</span>}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'red', label: 'Red Team', desc: 'Attacker — execute the pentest', color: 'rose', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
                    { v: 'blue', label: 'Blue Team', desc: 'Defender — SOC analyst / incident response', color: 'teal', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
                  ].map(r => (
                    <button key={r.v} onClick={() => setRole(r.v)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${role === r.v
                        ? r.color === 'rose' ? 'border-rose-500/50 bg-rose-950/20' : 'border-teal-500/50 bg-teal-950/20'
                        : 'border-slate-800 hover:border-slate-700'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className={`w-4 h-4 ${r.color === 'rose' ? 'text-rose-400' : 'text-teal-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={r.icon} />
                        </svg>
                        <span className={`text-sm font-semibold ${r.color === 'rose' ? 'text-rose-400' : 'text-teal-400'}`}>{r.label}</span>
                      </div>
                      <p className="text-xs text-slate-500">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Methodology */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  Methodology
                  {isBeginner && <span className="text-xs text-slate-600 ml-2">(PTES is recommended for beginners)</span>}
                </h3>
                <div className="space-y-2">
                  {METHODOLOGY_OPTIONS.map(m => (
                    <button key={m.value} onClick={() => setMethodology(m.value)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${methodology === m.value ? 'border-cyan-500/50 bg-cyan-950/10' : 'border-slate-800 hover:border-slate-700'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${methodology === m.value ? 'border-cyan-400' : 'border-slate-600'}`}>
                        {methodology === m.value && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium">{m.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setBriefing(null)} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 text-sm transition-colors">Cancel</button>
                <button onClick={launch} disabled={!!launching}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/10">
                  {launching ? 'Deploying environment...' : 'Start mission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
