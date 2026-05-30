import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '../lib/motion'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import CyberSimNav from '../components/nav/CyberSimNav'
import ParticleCanvas from '../components/canvas/ParticleCanvas'
import ScenarioCard from '../components/dashboard/ScenarioCard'
import { SkeletonCard, Button } from '../components/ui'
import api from '../lib/api'

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

const SCENARIO_SUMMARIES = {
  'SC-01': 'Attack and defend a healthcare web portal inside an isolated NovaMed network. Practice web reconnaissance, evidence capture, WAF telemetry, and OWASP-focused reporting.',
  'SC-02': 'Investigate a financial Active Directory compromise. Follow attacker movement through identity, Kerberos, file access, and SOC event correlation.',
  'SC-03': 'Run and investigate a controlled phishing campaign for Orion Logistics. Connect pretexting, email telemetry, endpoint behavior, and incident response notes.',
}

const FILTER_CHIPS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'web', label: 'Web', match: (scenario) => scenario.id === 'SC-01' || /web|owasp|sqli/i.test(JSON.stringify(scenario)) },
  { id: 'ad', label: 'Active Directory', match: (scenario) => scenario.id === 'SC-02' || /active directory|kerberos|smb/i.test(JSON.stringify(scenario)) },
  { id: 'phishing', label: 'Phishing', match: (scenario) => scenario.id === 'SC-03' || /phishing|email|gophish/i.test(JSON.stringify(scenario)) },
]

const DIFFICULTY_CHIPS = ['All', 'Beginner', 'Intermediate', 'Advanced']

const containerVariants = staggerContainer(0.04)
const cardVariants = staggerItem

export default function Dashboard() {
  const { scenarios, fetchScenarios, startSession } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedScenarioId = location.state?.scenarioId
  const [mySessions, setMySessions] = useState([])
  const [activeMission, setActiveMission] = useState(null)
  const [scenariosLoading, setScenariosLoading] = useState(true)
  const [launching, setLaunching] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [restarting, setRestarting] = useState(null)
  const [launchError, setLaunchError] = useState(null)
  const [briefing, setBriefing] = useState(null)
  const [role, setRole] = useState('red')
  const [methodology, setMethodology] = useState('ptes')
  const [userRole, setUserRole] = useState(null)
  const [query, setQuery] = useState('')
  const [filterChip, setFilterChip] = useState('all')
  const [difficultyChip, setDifficultyChip] = useState('All')

  const refreshData = async () => {
    try {
      const [sessRes, meRes, activeRes] = await Promise.all([
        api.get('/sessions/'),
        api.get('/auth/me'),
        api.get('/sessions/active')
      ])
      setMySessions(sessRes.data)
      setUserRole(meRes.data.role)
      setActiveMission(activeRes.data)
    } catch (e) {
      console.error("Dashboard refreshData error:", e)
    }
  }

  useEffect(() => {
    setScenariosLoading(true)
    fetchScenarios().finally(() => setScenariosLoading(false))
    refreshData()
  }, [fetchScenarios])

  useEffect(() => {
    if (!requestedScenarioId || !Array.isArray(scenarios) || scenarios.length === 0) return
    const requested = scenarios.find((sc) => sc.id === requestedScenarioId)
    if (!requested) return
    setBriefing(requested)
    navigate('/dashboard', { replace: true, state: {} })
  }, [requestedScenarioId, scenarios, navigate])

  const launch = async () => {
    if (!briefing) return
    setLaunching(briefing.id)
    setLaunchError(null)
    try {
      const session = await startSession(briefing.id, role, methodology)
      navigate(`/session/${session.id}/${role}`)
    } catch (e) {
      const detail = e.response?.data?.detail
      if (detail?.error === 'active_session_exists') {
        setLaunchError(`You have an active mission (${detail.scenario_id}). Please complete or terminate it before starting a new one.`)
      } else {
        setLaunchError(typeof detail === 'string' ? detail : e.message || 'Failed to start session')
      }
    } finally {
      setLaunching(null)
    }
  }

  const cancelMission = async (id) => {
    if (!window.confirm('Are you sure you want to terminate this mission? All progress will be lost.')) return
    setCancelling(id)
    try {
      await api.post(`/sessions/${id}/end`)
      await refreshData()
      setLaunchError(null)
    } catch (e) {
      window.alert('Failed to terminate mission')
    } finally {
      setCancelling(null)
    }
  }

  const restartScenario = async (id, role) => {
    if (!window.confirm('This will reset your progress to Phase 1. Your previous debrief report will be saved. Continue?')) return
    setRestarting(id)
    try {
      const res = await api.post(`/sessions/${id}/restart`)
      setActiveMission(res.data)
      navigate(`/session/${id}/${role}`)
    } catch (e) {
      console.error(e)
      window.alert('Failed to restart scenario')
    } finally {
      setRestarting(null)
    }
  }

  const isBeginner = skillLevel === 'beginner'
  const completedSessions = Array.isArray(mySessions) ? mySessions.filter(s => s?.completed_at) : []
  const activeFilter = FILTER_CHIPS.find(chip => chip.id === filterChip) || FILTER_CHIPS[0]
  const filteredScenarios = Array.isArray(scenarios) ? scenarios.filter((sc) => {
    if (!sc) return false
    const haystack = `${sc.id || ''} ${sc.title || ''} ${sc.description || ''} ${(LEARN_POINTS[sc.id] || []).join(' ')}`.toLowerCase()
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase())
    const matchesDifficulty = difficultyChip === 'All' || String(sc.difficulty || '').toLowerCase() === difficultyChip.toLowerCase()
    return matchesQuery && matchesDifficulty && activeFilter.match(sc)
  }) : []

  return (
    <div className="min-h-dvh bg-void text-txt-primary font-display">
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
      <div className="relative border-b border-cs-border bg-surface-1/40">
        <div className="absolute inset-0 h-64 overflow-hidden">
          <ParticleCanvas />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-12 pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="live-indicator">Briefing Terminal</span>
                <span className="text-[10px] font-mono text-txt-dim tracking-widest">// SEC_LEVEL: CLASSIFIED //</span>
              </div>
              <h1 className="text-4xl font-extrabold text-txt-primary tracking-tight font-display card-v3-header-glow">
                <span className="glitch-text" data-text="TACTICAL BRIEFING CENTER">TACTICAL BRIEFING CENTER</span>
              </h1>
              <p className="text-txt-secondary text-xs font-mono mt-2 max-w-lg">
                {isBeginner
                  ? 'Choose an operations environment below to begin hands-on practice inside isolated network subnets. Guided methodology gates and Socratic AI hints are enabled.'
                  : 'Select an active scenario, choose your team deployment mode, configure methodology gates, and initialize the target environment.'}
              </p>
            </div>
            {/* System Status Ticker */}
            <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-void/80 border border-cs-border rounded-cs max-w-md font-mono text-[10px] text-txt-secondary card-v3 card-v3-spotlight">
              <div>
                <span className="text-txt-dim block uppercase">Sandbox Node</span>
                <span className="text-green-signal font-bold uppercase">Online (172.30.0.1)</span>
              </div>
              <div>
                <span className="text-txt-dim block uppercase">Tutor API</span>
                <span className="text-cs-blue font-bold uppercase">Ready (Socratic)</span>
              </div>
              <div>
                <span className="text-txt-dim block uppercase">SIEM Core</span>
                <span className="text-amber-warn font-bold uppercase">Indexing Logs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pb-12">
        {/* Prominent Active Mission Banner */}
        {activeMission && activeMission.scenario_id && activeMission.role && (
          <div className="mb-10 p-6 rounded-cs-lg border border-cs-blue/30 bg-cs-blue/5 shadow-2xl shadow-cs-blue/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-5 items-center">
                <div className="w-12 h-12 rounded-cs bg-cs-blue/10 flex items-center justify-center border border-cs-blue/20">
                  <svg className="w-6 h-6 text-cs-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-cs-blue font-mono uppercase tracking-[0.2em] mb-1">Active Mission: {activeMission.scenario_id}</h3>
                  <p className="text-txt-primary font-bold">{scenarios.find(s => s.id === activeMission.scenario_id)?.title || 'Assigned Scenario'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-cs-sm border ${activeMission.role === 'red' ? 'text-cs-red border-cs-red/20 bg-cs-red/5' : 'text-cs-blue border-cs-blue/20 bg-cs-blue/5'}`}>
                      {(activeMission.role || '').toUpperCase()} TEAM
                    </span>
                    <span className="text-[10px] font-mono text-txt-dim uppercase tracking-wider">Phase {activeMission.phase || 1}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-cs-red hover:bg-cs-red/10 border-cs-red/20"
                  onClick={() => cancelMission(activeMission.id)}
                  disabled={!!cancelling || !!restarting}
                >
                  {cancelling === activeMission.id ? 'Terminating...' : 'Terminate Mission'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-txt-dim hover:text-txt-primary hover:bg-surface-3 border-cs-border"
                  onClick={() => restartScenario(activeMission.id, activeMission.role)}
                  disabled={!!cancelling || !!restarting}
                >
                  {restarting === activeMission.id ? 'Restarting...' : 'Restart Scenario'}
                </Button>
                <Button
                  variant="blue"
                  size="md"
                  className="bg-cs-blue hover:bg-cs-blue/80 shadow-lg shadow-cs-blue/20"
                  onClick={() => navigate(`/session/${activeMission.id}/${activeMission.role}`)}
                  disabled={!!cancelling || !!restarting}
                >
                  Resume Engagement
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scenario filter bar */}
        <div className="mb-6 flex flex-col gap-4 rounded-cs border border-cs-border bg-surface-2/30 p-4 md:flex-row md:items-center md:justify-between clip-chamfer-sm">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mr-2 select-none">Filters:</span>
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterChip(chip.id)}
                className={`btn-v3 btn-v3-sm ${
                  filterChip === chip.id ? 'btn-v3-blue' : 'btn-v3-subtle'
                }`}
              >
                {chip.label}
              </button>
            ))}
            <div className="h-4 w-[1px] bg-cs-border mx-1 hidden md:block" />
            {DIFFICULTY_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setDifficultyChip(chip)}
                className={`btn-v3 btn-v3-sm ${
                  difficultyChip === chip ? 'btn-v3-red' : 'btn-v3-subtle'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="relative w-full md:max-w-[260px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full text-xs font-mono pl-8 input-v3"
              placeholder="SEARCH PROTOCOLS / LOGS..."
            />
            <svg className="absolute left-2.5 top-3.5 w-3.5 h-3.5 text-txt-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <motion.div 
          className="grid gap-5 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {scenariosLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredScenarios.map(sc => {
                const summary = sc.description || SCENARIO_SUMMARIES[sc.id] || 'Hands-on mission in an isolated CyberSim training network.'
                return (
                  <motion.div key={sc.id} variants={cardVariants} className="h-full">
                    <ScenarioCard
                      scenario={sc}
                      summary={summary}
                      learnPoints={LEARN_POINTS[sc.id] || []}
                      showLearnPoints={isBeginner}
                      activeSessionId={activeMission?.scenario_id === sc.id ? activeMission?.id : null}
                      onClick={() => setBriefing(sc)}
                    />
                  </motion.div>
                )
              })
          }
        </motion.div>
        {filteredScenarios.length === 0 && !scenariosLoading && (
          <div className="mt-6 rounded-cs border border-cs-border bg-surface-1 p-6 text-sm text-txt-dim">
            No scenarios match the current filters.
          </div>
        )}

        {/* Recent completed sessions */}
        {completedSessions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-semibold text-txt-dim mb-3 font-mono uppercase tracking-wider">Completed Sessions</h2>
            <div className="space-y-2">
              {completedSessions.slice(0, 5).map(s => (
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="mission-modal hud-glass-void clip-chamfer shadow-2xl max-w-4xl w-full">
            {/* Header */}
            <div className="flex-shrink-0 p-5 sm:p-6 border-b border-cs-border relative overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{
                background: briefing.id === 'SC-01' ? 'linear-gradient(135deg, rgba(255,59,59,0.1), transparent)' :
                  briefing.id === 'SC-02' ? 'linear-gradient(135deg, rgba(59,139,255,0.1), transparent)' :
                  'linear-gradient(135deg, rgba(255,170,0,0.1), transparent)'
              }} />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs text-txt-dim bg-surface-3 px-2 py-0.5 rounded-cs-sm">{briefing.id}</span>
                  <span className="text-xs text-txt-dim font-mono">Mission Briefing</span>
                  <span className="ml-auto text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-cs-sm border border-amber-warn/30 bg-amber-warn/10 text-amber-warn flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Randomized Variant
                  </span>
                </div>
                <h2 className="text-xl font-bold text-txt-primary mb-1 font-display">{briefing.title}</h2>
                <p className="text-txt-secondary text-sm">{briefing.description || SCENARIO_SUMMARIES[briefing.id]}</p>
              </div>
            </div>

            <div className="mission-modal-body p-5 sm:p-6 space-y-5">
              {/* Network diagram */}
              <div>
                <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono">Target Network</h3>
                <div className="bg-surface-2 border border-cs-border rounded-cs p-4">
                  <p className="text-xs text-txt-dim mb-3 font-mono">Network: {briefing.id === 'SC-01' ? '172.20.1.0/24' : briefing.id === 'SC-02' ? '172.20.2.0/24' : '172.20.3.0/24'}</p>
                  <div className="space-y-2">
                    {(NETWORK_DIAGRAMS[briefing.id] || []).map(h => (
                      <div key={h.ip} className="flex min-w-0 items-center gap-3 text-xs">
                        <code className="flex-shrink-0 text-green-signal font-mono bg-green-signal/5 px-2 py-1 rounded-cs-sm">{h.ip}</code>
                        <span className="min-w-0 truncate text-txt-secondary">{h.label}</span>
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
                  <div className="grid gap-2 sm:grid-cols-2">
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
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { v: 'red', label: 'Red Team', desc: 'Attacker — execute the pentest', color: 'cs-red', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
                    { v: 'blue', label: 'Blue Team', desc: 'Defender — SOC analyst / incident response', color: 'cs-blue', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
                  ].map(r => (
                    <button key={r.v} onClick={() => setRole(r.v)}
                      className={`min-w-0 p-4 rounded-cs border-2 text-left transition-all ${role === r.v
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
                      <div className="min-w-0">
                        <div className="text-sm text-txt-primary font-semibold">{m.label}</div>
                        <div className="text-xs text-txt-dim mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {launchError && (
                <div className="rounded-cs border border-red-signal/40 bg-red-signal/10 px-3 py-2 text-xs text-red-signal font-mono">
                  {launchError}
                </div>
              )}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button onClick={() => { setBriefing(null); setLaunchError(null) }} variant="ghost" className="flex-1 justify-center text-sm">Cancel</Button>
                  {activeMission ? (
                    <Button
                      onClick={() => cancelMission(activeMission.id)}
                      disabled={!!cancelling}
                      variant="danger"
                      className="flex-1 justify-center text-sm"
                    >
                      {cancelling === activeMission.id ? 'Terminating...' : 'Terminate Mission'}
                    </Button>
                  ) : (
                    <Button onClick={launch} disabled={!!launching} variant="red" className="flex-1 justify-center text-sm">
                      {launching ? 'Deploying environment...' : 'Start mission'}
                    </Button>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
