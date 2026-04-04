import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useWebSocket } from '../hooks/useWebSocket'
import RoeBriefing from '../components/workspace/RoeBriefing'
import SiemFeed from '../components/siem/SiemFeed'
import Notebook from '../components/notes/Notebook'
import AiHintPanel from '../components/hints/AiHintPanel'
import PhaseTrail from '../components/methodology/PhaseTrail'
import api from '../lib/api'

const IR_PHASES = ['Identify', 'Detect & analyze', 'Contain', 'Eradicate', 'Recover', 'Post-incident']

const PLAYBOOKS = {
  'SC-01': [
    '1. Identify source IP of all HIGH/CRITICAL WAF alerts',
    '2. Correlate WAF events with Apache access log timestamps',
    '3. Determine if SQLi attempt resulted in a 200 response (success indicator)',
    '4. Check if any PHP files were uploaded to /var/www/html/uploads/',
    '5. Identify affected patient record IDs via IDOR alerts',
    '6. Block source IP at WAF level — document the firewall rule created',
    '7. Reset any credentials that may have been exposed via SQLi',
    '8. Write IR report: timeline, IOCs, affected data, RCA',
  ],
  'SC-05': [
    '1. Receive user report → open IR ticket with timestamp',
    '2. Identify suspicious process tree (Event 4688)',
    '3. Check for log clearing (Event 1102) — critical ransomware indicator',
    '4. Run Velociraptor hunt: Windows.System.Pslist on affected host',
    '5. Capture memory image BEFORE isolating the host',
    '6. Isolate compromised workstation from network',
    '7. Block C2 IP at perimeter firewall',
    '8. Hunt for lateral movement: check SMB connections to file server',
    '9. Identify persistence mechanisms (registry, scheduled tasks)',
    '10. Restore from clean backup — verify integrity before reconnecting',
    '11. Write full IR report with IOC list and RCA',
  ],
}

export default function BlueWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score, siemEvents } = useSessionStore()
  const [session, setSession] = useState(currentSession)
  const [roeAcked, setRoeAcked] = useState(currentSession?.roe_acknowledged ?? false)
  const [activeRight, setActiveRight] = useState('playbook') // playbook | hints
  const [activeBottom, setActiveBottom] = useState('notes') // notes | investigation

  const { requestHint } = useWebSocket(sessionId)

  useEffect(() => {
    if (!session) {
      api.get(`/sessions/${sessionId}`)
        .then(r => { setSession(r.data); setRoeAcked(r.data.roe_acknowledged) })
        .catch(() => navigate('/'))
    }
  }, [session, sessionId, navigate])

  const criticalCount = siemEvents.filter(e => e.severity === 'CRITICAL').length
  const highCount = siemEvents.filter(e => e.severity === 'HIGH').length

  if (!session) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">Loading...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  const playbook = PLAYBOOKS[session.scenario_id] || PLAYBOOKS['SC-01']

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-teal-400 text-xs font-semibold">BLUE TEAM — SOC</span>
        </div>
        <div className="h-4 w-px bg-gray-700" />
        <span className="text-gray-400 text-xs font-mono">{session.scenario_id}</span>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex-1 overflow-hidden">
          <PhaseTrail methodology="nist" role="blue" currentPhase={phase} />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {criticalCount > 0 && (
            <span className="text-xs text-red-400 bg-red-950 border border-red-800 px-2 py-0.5 rounded animate-pulse">
              {criticalCount} CRITICAL
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs text-orange-400 bg-orange-950 border border-orange-800 px-2 py-0.5 rounded">
              {highCount} HIGH
            </span>
          )}
          <div className="text-xs text-gray-400">Score: <span className={`font-semibold ${score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{score}</span></div>
          <button onClick={() => navigate(`/session/${sessionId}/debrief`)}
            className="text-xs px-2 py-1 border border-gray-700 text-gray-400 hover:text-gray-200 rounded transition-colors">
            Close incident →
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '1fr 320px', gridTemplateRows: '1fr 220px' }}>

        {/* SIEM — top left */}
        <div className="border-r border-b border-gray-800 flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span>SIEM — event correlation console</span>
            <LiveDot />
          </div>
          <div className="flex-1 overflow-hidden">
            <SiemFeed />
          </div>
        </div>

        {/* Right — playbook or AI */}
        <div className="border-b border-gray-800 flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <div className="flex gap-1 ml-1">
              {['playbook', 'hints'].map(p => (
                <button key={p} onClick={() => setActiveRight(p)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${activeRight === p ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {p === 'playbook' ? 'IR Playbook' : 'AI guide'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeRight === 'playbook'
              ? <PlaybookPanel steps={playbook} />
              : <AiHintPanel onRequestHint={requestHint} />
            }
          </div>
        </div>

        {/* Bottom left — notes */}
        <div className="border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="flex gap-1 ml-1">
              {['notes', 'investigation'].map(p => (
                <button key={p} onClick={() => setActiveBottom(p)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${activeBottom === p ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {p === 'notes' ? 'IR notebook' : 'Investigation'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeBottom === 'notes'
              ? <Notebook sessionId={sessionId} />
              : <InvestigationPanel />
            }
          </div>
        </div>

        {/* Bottom right — NIST guidance */}
        <div className="flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>NIST phase guidance</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NistGuidance phase={phase} scenarioId={session.scenario_id} />
          </div>
        </div>

      </div>
    </div>
  )
}

function LiveDot() {
  return (
    <div className="ml-auto flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span className="text-green-500 text-xs">live</span>
    </div>
  )
}

function PlaybookPanel({ steps }) {
  const [checked, setChecked] = useState({})
  const toggle = (i) => setChecked(p => ({ ...p, [i]: !p[i] }))

  return (
    <div className="overflow-y-auto h-full p-3 space-y-1.5">
      <p className="text-xs text-gray-600 mb-3">Work through each step. Check off as you complete.</p>
      {steps.map((step, i) => (
        <label key={i} className="flex items-start gap-2 cursor-pointer group">
          <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)}
            className="mt-0.5 w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 cursor-pointer flex-shrink-0" />
          <span className={`text-xs leading-relaxed transition-colors ${checked[i] ? 'text-gray-600 line-through' : 'text-gray-300 group-hover:text-gray-200'}`}>
            {step}
          </span>
        </label>
      ))}
    </div>
  )
}

function InvestigationPanel() {
  const events = useSessionStore(s => s.siemEvents)
  const [iocs, setIocs] = useState([])
  const [input, setInput] = useState('')

  const addIoc = () => {
    if (!input.trim()) return
    setIocs(p => [...p, { value: input.trim(), ts: new Date().toLocaleTimeString() }])
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs text-gray-500 mb-2">Extracted IOCs ({iocs.length})</p>
        {iocs.length === 0 ? (
          <p className="text-gray-700 text-xs">No IOCs added yet. Extract IPs, hashes, domains from SIEM events.</p>
        ) : (
          <div className="space-y-1">
            {iocs.map((ioc, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-mono">
                <span className="text-purple-400">{ioc.value}</span>
                <span className="text-gray-600">{ioc.ts}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-gray-800 p-2 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addIoc()}
          placeholder="Add IOC (IP, hash, domain...)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-600 font-mono" />
        <button onClick={addIoc} className="px-3 text-xs bg-purple-800 hover:bg-purple-700 text-white rounded transition-colors">Add</button>
      </div>
    </div>
  )
}

const NIST_GUIDANCE = {
  1: { phase: 'Identify', text: 'Determine what assets are affected. Correlate source IPs across events. What systems were targeted? What data was potentially at risk? Build the initial scope before taking any action.' },
  2: { phase: 'Detect & analyze', text: 'Confirm the attack is real (true positive vs false positive). Build the attack timeline: first event, progression, last observed activity. Identify the attack technique from event patterns.' },
  3: { phase: 'Contain', text: 'Stop the bleeding without destroying evidence. Isolate affected hosts. Block C2 IPs. Consider: will isolating now cause the attacker to trigger a dead-man switch? Capture volatile evidence first.' },
  4: { phase: 'Eradicate', text: "Remove the attacker's presence completely. Hunt for persistence: registry run keys, scheduled tasks, new user accounts, webshells. Verify every host — not just the first one identified." },
  5: { phase: 'Recover', text: 'Restore from known-good backups. Verify backup integrity before use. Monitor for reinfection for 48h. Patch the initial vulnerability before bringing systems back online.' },
  6: { phase: 'Post-incident', text: 'Write the IR report. Include: full timeline, IOC list, root cause, what data was at risk, what controls failed, and 3 specific recommendations to prevent recurrence.' },
}

function NistGuidance({ phase }) {
  const g = NIST_GUIDANCE[phase] || NIST_GUIDANCE[1]
  return (
    <div className="space-y-2.5">
      <div>
        <span className="text-xs text-teal-400 bg-teal-950 border border-teal-800 px-2 py-0.5 rounded">
          NIST 800-61 — {g.phase}
        </span>
      </div>
      <p className="text-xs text-gray-300 leading-relaxed">{g.text}</p>
    </div>
  )
}
