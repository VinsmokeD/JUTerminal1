import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import CyberSimNav from '../components/nav/CyberSimNav'
import ParticleCanvas from '../components/canvas/ParticleCanvas'
import api from '../lib/api'

const DIFFICULTY_STYLE = {
  Intermediate: 'difficulty-inter',
  Advanced: 'difficulty-adv',
  Beginner: 'difficulty-beg',
}

const SCENARIO_CLASSES = {
  'SC-01': 'sc-01',
  'SC-02': 'sc-02',
  'SC-03': 'sc-03',
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
  const { username, skillLevel } = useAuthStore()
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
    <div className="min-h-screen bg-void text-txt-primary font-display">
      {/* Nav */}
      <CyberSimNav
        rightContent={
          userRole === 'instructor' && (
            <button onClick={() => navigate('/instructor')} className="text-cs-blue hover:text-cs-blue/80 text-sm font-mono transition-colors">
              Instructor
            </button>
          )
        }
      />

      {/* Hero area with particle background */}
      <div className="relative">
        <div className="absolute inset-0 h-64 overflow-hidden">
          <ParticleCanvas />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-12 pb-8">
          <h1 className="text-3xl font-extrabold text-txt-primary mb-2 tracking-tight">Training Scenarios</h1>
          <p className="text-txt-secondary text-sm max-w-lg">
            {isBeginner
              ? 'Choose a scenario to begin your training. Each one teaches different cybersecurity skills through hands-on practice in a safe, sandboxed environment.'
              : 'Select a scenario, choose your role and methodology, then launch your session.'}
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pb-12">
        {/* Active sessions banner */}
        {mySessions.filter(s => !s.completed_at).length > 0 && (
          <div className="mb-8 p-4 rounded-cs-lg border border-cs-blue/20 bg-cs-blue-surface">
            <h3 className="text-sm font-semibold text-cs-blue mb-3 font-mono uppercase tracking-wider">Active Sessions</h3>
            <div className="flex gap-3 flex-wrap">
              {mySessions.filter(s => !s.completed_at).slice(0, 3).map(s => (
                <button key={s.id} onClick={() => navigate(`/session/${s.id}/${s.role}`)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-cs border border-cs-border bg-surface-1 hover:border-cs-blue/30 transition-all group">
                  <span className="font-mono text-xs text-cs-blue">{s.scenario_id}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-cs-sm font-mono font-medium ${
                    s.role === 'red' ? 'text-cs-red bg-cs-red-dim' : 'text-cs-blue bg-cs-blue-dim'
                  }`}>{s.role}</span>
                  <span className="text-txt-dim text-xs font-mono">Phase {s.phase}</span>
                  <span className="text-cs-blue text-xs font-semibold group-hover:underline">Resume →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scenario cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {scenarios.map(sc => {
            const diffCls = DIFFICULTY_STYLE[sc.difficulty] || DIFFICULTY_STYLE.Intermediate
            const scCls = SCENARIO_CLASSES[sc.id] || 'sc-01'
            const learns = LEARN_POINTS[sc.id] || []
            return (
              <div key={sc.id} className={`scenario-card ${scCls}`} onClick={() => setBriefing(sc)}>
                <div className="scenario-id">{sc.id}</div>
                <h3>{sc.title}</h3>
                <p>{sc.description}</p>

                {/* What you'll learn */}
                {isBeginner && learns.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-txt-dim font-mono mb-2">What you'll learn:</p>
                    <div className="space-y-1">
                      {learns.slice(0, 3).map(l => (
                        <div key={l} className="flex items-center gap-2 text-xs text-txt-secondary">
                          <div className="w-1 h-1 rounded-full bg-cs-blue flex-shrink-0" />
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex gap-1.5 flex-wrap mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium border border-cs-border ${diffCls}`}>{sc.difficulty}</span>
                  {sc.frameworks?.map(f => (
                    <span key={f} className="px-2.5 py-0.5 rounded-full font-mono text-[10px] border border-cs-border text-txt-dim">{f}</span>
                  ))}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setBriefing(sc) }}
                  className="w-full btn btn-blue btn-sm justify-center text-sm">
                  {isBeginner ? 'View briefing' : 'Launch'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Recent completed sessions */}
        {mySessions.filter(s => s.completed_at).length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-semibold text-txt-dim mb-3 font-mono uppercase tracking-wider">Completed Sessions</h2>
            <div className="space-y-2">
              {mySessions.filter(s => s.completed_at).slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between bg-surface-1 border border-cs-border rounded-cs px-4 py-3 text-xs">
                  <span className="font-mono text-cs-blue">{s.scenario_id}</span>
                  <span className={`px-2 py-0.5 rounded-cs-sm font-mono font-medium ${
                    s.role === 'red' ? 'text-cs-red bg-cs-red-dim' : 'text-cs-blue bg-cs-blue-dim'
                  }`}>{s.role}</span>
                  <span className="text-txt-dim font-mono">Phase {s.phase}</span>
                  <span className="text-amber-warn font-bold font-mono">Score: {s.score}</span>
                  <span className="text-txt-dim">{new Date(s.started_at).toLocaleDateString()}</span>
                  <button onClick={() => navigate(`/session/${s.id}/debrief`)} className="text-cs-blue hover:underline font-medium">View report</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mission Briefing Modal */}
      {briefing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-cs-border rounded-cs-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-cs-border relative overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{
                background: briefing.id === 'SC-01' ? 'linear-gradient(135deg, rgba(255,59,59,0.1), transparent)' :
                  briefing.id === 'SC-02' ? 'linear-gradient(135deg, rgba(59,139,255,0.1), transparent)' :
                  'linear-gradient(135deg, rgba(255,170,0,0.1), transparent)'
              }} />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs text-txt-dim bg-surface-3 px-2 py-0.5 rounded-cs-sm">{briefing.id}</span>
                  <span className="text-xs text-txt-dim font-mono">Mission Briefing</span>
                </div>
                <h2 className="text-xl font-bold text-txt-primary mb-1 font-display">{briefing.title}</h2>
                <p className="text-txt-secondary text-sm">{briefing.description}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Network diagram */}
              <div>
                <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono">Target Network</h3>
                <div className="bg-surface-2 border border-cs-border rounded-cs p-4">
                  <p className="text-xs text-txt-dim mb-3 font-mono">Network: {briefing.id === 'SC-01' ? '172.20.1.0/24' : briefing.id === 'SC-02' ? '172.20.2.0/24' : '172.20.3.0/24'}</p>
                  <div className="space-y-2">
                    {(NETWORK_DIAGRAMS[briefing.id] || []).map(h => (
                      <div key={h.ip} className="flex items-center gap-3 text-xs">
                        <code className="text-green-signal font-mono bg-green-signal/5 px-2 py-1 rounded-cs-sm">{h.ip}</code>
                        <span className="text-txt-secondary">{h.label}</span>
                        <span className={`ml-auto px-1.5 py-0.5 rounded-cs-sm text-xs font-mono ${
                          h.type === 'target' ? 'text-cs-red bg-cs-red-dim' :
                          h.type === 'defense' ? 'text-cs-blue bg-cs-blue-dim' :
                          h.type === 'tool' ? 'text-green-signal bg-green-signal/10' :
                          'text-amber-warn bg-amber-warn/10'
                        }`}>{h.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* What you'll learn (beginner) */}
              {isBeginner && (
                <div>
                  <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono">What you'll learn</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(LEARN_POINTS[briefing.id] || []).map(l => (
                      <div key={l} className="flex items-center gap-2 text-xs text-txt-secondary">
                        <div className="w-1.5 h-1.5 rounded-full bg-cs-blue flex-shrink-0" />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role selection */}
              <div>
                <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono">
                  Your role
                  {isBeginner && <span className="text-xs text-txt-dim ml-2 font-normal">(Red Team recommended for your first time)</span>}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'red', label: 'Red Team', desc: 'Attacker — execute the pentest', color: 'cs-red', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
                    { v: 'blue', label: 'Blue Team', desc: 'Defender — SOC analyst / incident response', color: 'cs-blue', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
                  ].map(r => (
                    <button key={r.v} onClick={() => setRole(r.v)}
                      className={`p-4 rounded-cs border-2 text-left transition-all ${role === r.v
                        ? r.color === 'cs-red' ? 'border-cs-red/50 bg-cs-red-surface' : 'border-cs-blue/50 bg-cs-blue-surface'
                        : 'border-cs-border hover:border-cs-border-glow'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className={`w-4 h-4 ${r.color === 'cs-red' ? 'text-cs-red' : 'text-cs-blue'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={r.icon} />
                        </svg>
                        <span className={`text-sm font-bold ${r.color === 'cs-red' ? 'text-cs-red' : 'text-cs-blue'}`}>{r.label}</span>
                      </div>
                      <p className="text-xs text-txt-dim">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Methodology */}
              <div>
                <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono">
                  Methodology
                  {isBeginner && <span className="text-xs text-txt-dim ml-2 font-normal">(PTES is recommended for beginners)</span>}
                </h3>
                <div className="space-y-2">
                  {METHODOLOGY_OPTIONS.map(m => (
                    <button key={m.value} onClick={() => setMethodology(m.value)}
                      className={`w-full p-3 rounded-cs border-2 text-left transition-all flex items-center gap-3 ${
                        methodology === m.value ? 'border-cs-blue/50 bg-cs-blue-surface' : 'border-cs-border hover:border-cs-border-glow'
                      }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        methodology === m.value ? 'border-cs-blue' : 'border-surface-4'
                      }`}>
                        {methodology === m.value && <div className="w-2 h-2 rounded-full bg-cs-blue" />}
                      </div>
                      <div>
                        <div className="text-sm text-txt-primary font-semibold">{m.label}</div>
                        <div className="text-xs text-txt-dim mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setBriefing(null)} className="flex-1 btn btn-ghost justify-center text-sm">Cancel</button>
                <button onClick={launch} disabled={!!launching}
                  className="flex-1 btn btn-red justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm">
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
