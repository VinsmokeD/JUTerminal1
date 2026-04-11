import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import RoeBriefing from '../components/workspace/RoeBriefing'
import Terminal from '../components/terminal/Terminal'
import SiemFeed from '../components/siem/SiemFeed'
import GuidedNotebook from '../components/notes/GuidedNotebook'
import AiHintPanel from '../components/hints/AiHintPanel'
import PhaseTrail from '../components/methodology/PhaseTrail'
import api from '../lib/api'

const PLAYBOOKS = {
  'SC-01': [
    { step: 'Identify source IP of all HIGH/CRITICAL WAF alerts', hint: 'Look at the source_ip field in SIEM events' },
    { step: 'Correlate WAF events with Apache access log timestamps', hint: 'Events within seconds of each other likely share a cause' },
    { step: 'Determine if SQLi attempt resulted in a 200 response', hint: 'A 200 response to a SQL injection attempt means it succeeded' },
    { step: 'Check if any PHP files were uploaded to /uploads/', hint: 'File upload + PHP = potential webshell' },
    { step: 'Identify affected patient record IDs via IDOR alerts', hint: 'Sequential ID access patterns indicate IDOR exploitation' },
    { step: 'Block source IP at WAF level', hint: 'Document the exact firewall rule you would create' },
    { step: 'Reset any exposed credentials', hint: 'Any credentials visible in SQLi output are compromised' },
    { step: 'Write IR report: timeline, IOCs, affected data, RCA', hint: 'The report is the deliverable — structure it with clear sections' },
  ],
  'SC-02': [
    { step: 'Identify Event 4769 with RC4 encryption (0x17)', hint: 'RC4 in Kerberos TGS requests is the signature of Kerberoasting' },
    { step: 'Determine which account was Kerberoasted', hint: 'Check the TargetUserName field in Event 4769' },
    { step: 'Correlate 4769 with 4768 (TGT request) timestamps', hint: 'TGT request immediately before TGS request confirms the chain' },
    { step: 'Identify lateral movement: Event 4624 Type 3', hint: 'Type 3 logons from non-standard IPs indicate lateral movement' },
    { step: 'Alert on Event 4625 bursts (credential spray)', hint: 'Multiple 4625 events from one IP = credential spray/brute force' },
    { step: 'CRITICAL: Event 4662 with replication rights = DCSync', hint: 'DCSync is the final stage — escalate immediately' },
    { step: 'Disable compromised svc_backup account', hint: 'Any Kerberoasted account with cracked password must be disabled' },
    { step: 'Force Kerberos ticket expiry (purge all TGTs)', hint: 'Prevents use of stolen tickets' },
    { step: 'Document full lateral movement path', hint: 'Source host -> destination -> technique used for each hop' },
    { step: 'Write IR report with AD hardening recommendations', hint: 'Include: disable RC4, SPN cleanup, tiered admin model' },
  ],
  'SC-03': [
    { step: 'Review email headers: SPF, DKIM, DMARC results', hint: 'Headers reveal whether the email passed authentication checks' },
    { step: 'Check if sending IP is in SPF record', hint: 'SPF failures mean the sender is unauthorized' },
    { step: 'Check DMARC alignment', hint: 'From domain vs envelope sender mismatch = spoofing' },
    { step: 'Identify which recipients opened the email', hint: 'Tracking pixel fires in SIEM events show who opened it' },
    { step: 'Check for macro execution (Event 4688)', hint: 'Office process spawning cmd.exe is the indicator' },
    { step: 'Identify PowerShell download cradle (Event 4104)', hint: 'Script block logging captures the actual PowerShell commands' },
    { step: 'Look for scheduled task creation (persistence)', hint: 'Attackers create scheduled tasks to survive reboots' },
    { step: 'Block external C2 IP at perimeter firewall', hint: 'The reverse shell destination IP is the C2 server' },
    { step: 'Isolate endpoints that executed the payload', hint: 'Any host that ran the macro needs isolation' },
    { step: 'Write phishing IR report with IOC list', hint: 'Include: sender domain, attachment hash, C2 IP, email security recommendations' },
  ],
}

const NIST_PHASES = {
  1: { name: 'Identify', desc: 'Determine what assets are affected. Correlate source IPs across events. What systems were targeted? What data was at risk?' },
  2: { name: 'Detect & Analyze', desc: 'Confirm the attack is real (true/false positive). Build the attack timeline. Identify the technique from event patterns.' },
  3: { name: 'Contain', desc: 'Stop the bleeding without destroying evidence. Isolate hosts, block C2 IPs. Capture volatile evidence first.' },
  4: { name: 'Eradicate', desc: 'Remove attacker presence. Hunt for persistence: registry keys, scheduled tasks, new accounts, webshells.' },
  5: { name: 'Recover', desc: 'Restore from known-good backups. Verify integrity. Monitor for reinfection. Patch the initial vulnerability.' },
  6: { name: 'Post-Incident', desc: 'Write IR report: timeline, IOC list, root cause, what controls failed, 3 specific prevention recommendations.' },
}

export default function BlueWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score, siemEvents, aiMode } = useSessionStore()
  const { skillLevel } = useAuthStore()
  const [session, setSession] = useState(currentSession)
  const [roeAcked, setRoeAcked] = useState(currentSession?.roe_acknowledged ?? false)
  const [siemFilter, setSiemFilter] = useState('')
  const [checkedSteps, setCheckedSteps] = useState({})
  const [iocs, setIocs] = useState([])
  const [iocInput, setIocInput] = useState('')
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [activePanel, setActivePanel] = useState('siem') // siem | terminal
  const writeOutputRef = useRef(null)

  const { sendRawInput, sendCommand, requestHint, toggleMode } = useWebSocket(sessionId)

  const handleRawInput = useCallback((data) => { sendRawInput(data) }, [sendRawInput])
  const handleCommand = useCallback((cmd) => { sendCommand(cmd) }, [sendCommand])

  useEffect(() => {
    if (!session) {
      api.get(`/sessions/${sessionId}`)
        .then(r => { setSession(r.data); setRoeAcked(r.data.roe_acknowledged) })
        .catch(() => navigate('/'))
    }
  }, [session, sessionId, navigate])

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const criticalCount = siemEvents.filter(e => e.severity === 'CRITICAL').length
  const highCount = siemEvents.filter(e => e.severity === 'HIGH').length

  // SIEM filtering
  const filteredEvents = siemEvents.filter(e => {
    if (!siemFilter) return true
    const q = siemFilter.toLowerCase()
    // Support structured queries like severity:HIGH
    if (q.includes(':')) {
      const [field, val] = q.split(':')
      if (field === 'severity') return e.severity?.toLowerCase() === val.toLowerCase()
      if (field === 'source_ip' || field === 'ip') return e.source_ip?.includes(val)
      if (field === 'source') return e.source?.toLowerCase() === val.toLowerCase()
    }
    // Free text search
    return JSON.stringify(e).toLowerCase().includes(q)
  })

  const addIoc = () => {
    if (!iocInput.trim()) return
    setIocs(p => [...p, { value: iocInput.trim(), ts: new Date().toLocaleTimeString(), type: _classifyIoc(iocInput.trim()) }])
    setIocInput('')
  }

  if (!session) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Loading...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  const playbook = PLAYBOOKS[session.scenario_id] || PLAYBOOKS['SC-01']
  const nist = NIST_PHASES[phase] || NIST_PHASES[1]

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 border-b border-slate-800/50 flex-shrink-0 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="text-slate-600 hover:text-slate-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-teal-400 text-xs font-bold tracking-wide">BLUE TEAM &mdash; SOC</span>
        </div>
        <div className="h-4 w-px bg-slate-800" />
        <span className="text-slate-500 text-xs font-mono">{session.scenario_id}</span>
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex-1 overflow-hidden">
          <PhaseTrail methodology="nist" role="blue" currentPhase={phase} />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {criticalCount > 0 && (
            <span className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/30 px-2 py-0.5 rounded-md animate-pulse font-bold">
              {criticalCount} CRITICAL
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs text-orange-400 bg-orange-950/30 border border-orange-800/30 px-2 py-0.5 rounded-md">
              {highCount} HIGH
            </span>
          )}
          <span className="text-xs text-slate-500 font-mono">{formatTime(elapsed)}</span>
          <div className="text-xs text-slate-400">
            Score: <span className={`font-bold ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{score}</span>
          </div>
          <button onClick={() => navigate(`/session/${sessionId}/debrief`)}
            className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 rounded-lg transition-all">
            Close incident
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '1fr 340px', gridTemplateRows: '1fr 1fr 200px' }}>

        {/* Left panel — SIEM Console / Investigation Terminal (toggle), spans 2 rows */}
        <div className="row-span-2 border-r border-slate-800/50 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/30 flex-shrink-0">
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5">
              <button onClick={() => setActivePanel('siem')}
                className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${activePanel === 'siem' ? 'bg-teal-600/20 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                SIEM
              </button>
              <button onClick={() => setActivePanel('terminal')}
                className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${activePanel === 'terminal' ? 'bg-cyan-600/20 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                Terminal
              </button>
            </div>
            {activePanel === 'siem' && (
              <>
                <div className="flex-1 mx-2">
                  <input
                    value={siemFilter}
                    onChange={e => setSiemFilter(e.target.value)}
                    placeholder="Filter: severity:HIGH, source_ip:172.20.1.10, or free text..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-md px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-500 text-xs">live</span>
                </div>
                <span className="text-xs text-slate-600">{filteredEvents.length} events</span>
              </>
            )}
            {activePanel === 'terminal' && (
              <span className="text-xs text-slate-500 ml-2">Investigation shell — tshark, grep logs, check configs</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {activePanel === 'siem' ? (
              <div className="h-full overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="p-4 text-xs text-slate-600 text-center">
                    {siemFilter ? 'No events match your filter.' : 'Waiting for events...'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/30">
                    {filteredEvents.map((event, i) => (
                      <SiemEventRow key={event.id} event={event} expanded={expandedEvent === event.id}
                        onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                        onExtractIoc={(val) => { setIocs(p => [...p, { value: val, ts: new Date().toLocaleTimeString(), type: _classifyIoc(val) }]) }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Terminal onData={handleRawInput} onCommand={handleCommand} pendingOutput={writeOutputRef} />
            )}
          </div>
        </div>

        {/* IR Playbook — top right */}
        <div className="border-b border-slate-800/50 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/30 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-xs text-slate-300 font-medium">IR Playbook</span>
            <span className="text-xs text-slate-600 ml-auto">{Object.values(checkedSteps).filter(Boolean).length}/{playbook.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {playbook.map((item, i) => (
              <label key={i} className="flex items-start gap-2 cursor-pointer group">
                <input type="checkbox" checked={!!checkedSteps[i]} onChange={() => setCheckedSteps(p => ({ ...p, [i]: !p[i] }))}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 cursor-pointer flex-shrink-0 accent-teal-500" />
                <div className="flex-1">
                  <span className={`text-xs leading-relaxed transition-colors ${checkedSteps[i] ? 'text-slate-600 line-through' : 'text-slate-300 group-hover:text-slate-200'}`}>
                    {item.step}
                  </span>
                  {skillLevel === 'beginner' && !checkedSteps[i] && (
                    <p className="text-xs text-slate-600 mt-0.5 italic">{item.hint}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* AI Tutor + NIST — middle right */}
        <div className="border-b border-slate-800/50 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/30 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <span className="text-xs text-slate-300 font-medium">AI Tutor</span>
            <span className="text-xs text-teal-400 bg-teal-950/30 border border-teal-800/30 px-1.5 py-0.5 rounded ml-auto">
              NIST: {nist.name}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <AiHintPanel onRequestHint={requestHint} onToggleMode={toggleMode} />
          </div>
        </div>

        {/* Bottom — Notebook + IOCs */}
        <div className="col-span-2 border-t border-slate-800/50 flex overflow-hidden">
          {/* Notebook */}
          <div className="flex-1 border-r border-slate-800/50 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/30 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-300 font-medium">IR Notebook</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <GuidedNotebook sessionId={sessionId} role="blue" phase={phase} />
            </div>
          </div>

          {/* IOC Panel */}
          <div className="w-72 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/30 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span className="text-xs text-slate-300 font-medium">IOCs</span>
              <span className="text-xs text-slate-600 ml-auto">{iocs.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {iocs.length === 0 ? (
                <p className="text-xs text-slate-700 p-2">Click IPs, hashes, or domains in SIEM events to extract them here.</p>
              ) : (
                <div className="space-y-1">
                  {iocs.map((ioc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-purple-800/30 bg-purple-950/10">
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        ioc.type === 'ip' ? 'text-emerald-400 bg-emerald-950/30' :
                        ioc.type === 'hash' ? 'text-amber-400 bg-amber-950/30' :
                        'text-cyan-400 bg-cyan-950/30'
                      }`}>{ioc.type}</span>
                      <span className="font-mono text-purple-300 flex-1 truncate">{ioc.value}</span>
                      <span className="text-slate-700">{ioc.ts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-slate-800 p-2 flex gap-1.5">
              <input value={iocInput} onChange={e => setIocInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIoc()}
                placeholder="Add IOC..."
                className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-md px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-600 font-mono" />
              <button onClick={addIoc} className="px-2.5 text-xs bg-purple-800/50 hover:bg-purple-700/50 text-purple-300 rounded-md transition-colors">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SiemEventRow({ event, expanded, onToggle, onExtractIoc }) {
  const sevColor = {
    CRITICAL: 'text-rose-400 bg-rose-950/30 border-rose-800/30',
    HIGH: 'text-orange-400 bg-orange-950/30 border-orange-800/30',
    MEDIUM: 'text-amber-400 bg-amber-950/30 border-amber-800/30',
    LOW: 'text-slate-400 bg-slate-800/30 border-slate-700/30',
    INFO: 'text-slate-500 bg-slate-800/20 border-slate-800/20',
  }
  const isBackground = event.source === 'background'

  return (
    <div className={`${isBackground ? 'opacity-40' : ''}`}>
      <button onClick={onToggle} className="w-full text-left px-3 py-2 hover:bg-slate-800/20 transition-colors flex items-center gap-2">
        <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${sevColor[event.severity] || sevColor.INFO}`} style={{ fontSize: '10px' }}>
          {event.severity}
        </span>
        <span className="text-xs text-slate-300 flex-1 truncate">{event.message}</span>
        {event.source_ip && (
          <button onClick={(e) => { e.stopPropagation(); onExtractIoc(event.source_ip) }}
            className="text-xs text-emerald-600 hover:text-emerald-400 font-mono px-1 rounded hover:bg-emerald-950/30"
            title="Extract as IOC">
            {event.source_ip}
          </button>
        )}
        {event.mitre_technique && (
          <span className="text-xs text-purple-500 font-mono">{event.mitre_technique}</span>
        )}
        <span className="text-xs text-slate-700">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : ''}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 bg-slate-800/10">
          <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap bg-slate-900/50 rounded-lg p-3 border border-slate-800/30">
            {event.raw_log || JSON.stringify(event, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function _classifyIoc(val) {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(val)) return 'ip'
  if (/^[a-f0-9]{32,}$/i.test(val)) return 'hash'
  if (val.includes('.') && !val.includes(' ')) return 'domain'
  return 'other'
}
