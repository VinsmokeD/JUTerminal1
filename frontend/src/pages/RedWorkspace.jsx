import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { useWebSocket } from '../hooks/useWebSocket'
import RoeBriefing from '../components/workspace/RoeBriefing'
import Terminal from '../components/terminal/Terminal'
import SiemFeed from '../components/siem/SiemFeed'
import Notebook from '../components/notes/Notebook'
import AiHintPanel from '../components/hints/AiHintPanel'
import PhaseTrail from '../components/methodology/PhaseTrail'
import api from '../lib/api'

export default function RedWorkspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { currentSession, phase, score } = useSessionStore()
  const [session, setSession] = useState(currentSession)
  const [roeAcked, setRoeAcked] = useState(currentSession?.roe_acknowledged ?? false)
  const [activePanel, setActivePanel] = useState('notes') // notes | hints
  const writeOutputRef = useRef(null)

  const { sendCommand, requestHint } = useWebSocket(sessionId)

  useEffect(() => {
    if (!session) {
      api.get(`/sessions/${sessionId}`)
        .then(r => { setSession(r.data); setRoeAcked(r.data.roe_acknowledged) })
        .catch(() => navigate('/'))
    }
  }, [session, sessionId, navigate])

  const handleCommand = useCallback((cmd) => {
    sendCommand(cmd)
  }, [sendCommand])

  const handleTerminalOutput = useCallback((text) => {
    if (writeOutputRef.current) writeOutputRef.current(text)
  }, [])

  if (!session) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">Loading session...</div>
  if (!roeAcked) return <RoeBriefing session={session} onAcknowledged={() => setRoeAcked(true)} />

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-semibold">RED TEAM</span>
        </div>
        <div className="h-4 w-px bg-gray-700" />
        <span className="text-gray-400 text-xs font-mono">{session.scenario_id}</span>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex-1 overflow-hidden">
          <PhaseTrail methodology={session.methodology} role="red" currentPhase={phase} />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-xs text-gray-400">Score: <span className={`font-semibold ${score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{score}</span></div>
          <button onClick={() => navigate(`/session/${sessionId}/debrief`)}
            className="text-xs px-2 py-1 border border-gray-700 text-gray-400 hover:text-gray-200 rounded transition-colors">
            End &amp; debrief →
          </button>
        </div>
      </div>

      {/* Main workspace grid */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '1fr 320px', gridTemplateRows: '1fr 240px' }}>

        {/* Terminal — top left (large) */}
        <div className="border-r border-b border-gray-800 flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Kali terminal — attacker workspace</span>
            <div className="ml-auto flex gap-1.5">
              <MitreBadge label="TA0001 Initial Access" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Terminal
              onCommand={handleCommand}
              pendingOutput={writeOutputRef}
            />
          </div>
        </div>

        {/* SIEM — top right */}
        <div className="border-b border-gray-800 flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span>SOC — live SIEM feed</span>
            <LiveIndicator />
          </div>
          <div className="flex-1 overflow-hidden">
            <SiemFeed />
          </div>
        </div>

        {/* Bottom left — notes */}
        <div className="border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Pentest notebook</span>
            <div className="ml-auto flex gap-1">
              {['notes', 'hints'].map(p => (
                <button key={p} onClick={() => setActivePanel(p)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${activePanel === p ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {p === 'notes' ? 'Notes' : 'AI hints'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {activePanel === 'notes'
              ? <Notebook sessionId={sessionId} />
              : <AiHintPanel onRequestHint={requestHint} />
            }
          </div>
        </div>

        {/* Bottom right — methodology context */}
        <div className="flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Learning context</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <LearningContext scenario={session.scenario_id} phase={phase} methodology={session.methodology} />
          </div>
        </div>

      </div>
    </div>
  )
}

function MitreBadge({ label }) {
  return (
    <span className="text-purple-400 bg-purple-950 border border-purple-800 text-xs px-1.5 py-px rounded">{label}</span>
  )
}

function LiveIndicator() {
  return (
    <div className="ml-auto flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span className="text-green-500 text-xs">live</span>
    </div>
  )
}

const CONTEXT = {
  'SC-01': [
    { phase: 1, mitre: 'T1590', cwe: null, title: 'Passive reconnaissance', body: 'Gather information without touching the target. HTTP headers, robots.txt, and SSL certificates reveal the technology stack before you send a single probe.', tools: ['whatweb', 'curl -I'] },
    { phase: 2, mitre: 'T1595', cwe: null, title: 'Active scanning & enumeration', body: 'Directory brute-forcing maps the attack surface. A 403 is as informative as a 200 — it confirms the path exists. robots.txt often discloses paths the developer wanted hidden.', tools: ['nmap', 'gobuster', 'nikto'] },
    { phase: 3, mitre: 'T1190', cwe: 'CWE-89', title: 'SQL injection identification', body: "A single quote in a form field tests whether input reaches a SQL query without sanitization. An error message leaking database type is a critical finding on its own.", tools: ['sqlmap'] },
    { phase: 4, mitre: 'T1552', cwe: 'CWE-22', title: 'Exploitation (LFI + RCE)', body: 'LFI (Local File Inclusion) allows reading arbitrary files. /etc/passwd, application configs, and log files are high-value targets. Chaining LFI with a file upload becomes RCE.', tools: ['curl'] },
    { phase: 5, mitre: 'T1005', cwe: null, title: 'Post-exploitation & evidence', body: 'Professional pentests require evidence chains. Every finding needs: the exact request, the exact response, the CVSS score, and a remediation recommendation.', tools: [] },
    { phase: 6, mitre: null, cwe: null, title: 'Reporting', body: 'The deliverable is the report, not the hack. Executive summary uses business language. Technical findings include reproduction steps any developer can follow.', tools: [] },
  ],
  'SC-02': [
    { phase: 1, mitre: 'T1087', cwe: null, title: 'AD reconnaissance with BloodHound', body: 'Before attacking, map the entire Active Directory trust structure. BloodHound visualizes relationships between users, groups, and machines — revealing the shortest path to Domain Admin without firing a single exploit.', tools: ['bloodhound-python', 'crackmapexec'] },
    { phase: 2, mitre: 'T1558.003', cwe: null, title: 'Kerberoasting', body: 'Service accounts with SPNs can have their TGS tickets requested by any domain user. The ticket is encrypted with the service account password hash — crack it offline. RC4 encryption (type 0x17) is the tell-tale sign.', tools: ['impacket-GetUserSPNs', 'hashcat'] },
    { phase: 3, mitre: 'T1021', cwe: null, title: 'Lateral movement', body: 'With cracked credentials, verify access across the network. CrackMapExec tests SMB auth against all hosts — any "(Pwn3d!)" means local admin. Service accounts often have excessive privileges on servers they manage.', tools: ['crackmapexec', 'impacket-psexec'] },
    { phase: 4, mitre: 'T1003.006', cwe: null, title: 'DCSync & domain dominance', body: 'DCSync mimics a domain controller replication request to extract all password hashes. This requires Domain Admin or Replication rights. With the krbtgt hash, you can forge Golden Tickets for persistent access.', tools: ['impacket-secretsdump'] },
  ],
  'SC-03': [
    { phase: 1, mitre: 'T1598', cwe: null, title: 'OSINT & target profiling', body: 'Effective phishing starts with research. LinkedIn job titles, company domain naming conventions, recent press releases — the more specific your pretext, the higher the click rate.', tools: ['theHarvester'] },
    { phase: 2, mitre: 'T1566.001', cwe: null, title: 'Phishing campaign setup', body: 'GoPhish orchestrates the full campaign: email templates, landing pages, and tracking. A logistics company invoice pretext is natural. The sending profile must use the Postfix relay to pass SPF checks.', tools: ['GoPhish (172.20.3.40:3333)'] },
    { phase: 3, mitre: 'T1204.002', cwe: null, title: 'Payload creation & delivery', body: 'msfvenom generates payloads embedded in documents. A macro-enabled .docm disguised as an invoice is the classic initial access vector. The reverse shell phones home to your listener — that callback is your flag.', tools: ['msfvenom', 'msfconsole'] },
    { phase: 4, mitre: 'T1071', cwe: null, title: 'Campaign execution & C2', body: 'Launch the campaign via GoPhish, monitor open/click rates in real-time. Watch your listener for the callback from 172.20.3.30 (simulated endpoint). A successful callback confirms code execution.', tools: ['GoPhish', 'nc -lvp 4444'] },
    { phase: 5, mitre: null, cwe: null, title: 'Phishing simulation report', body: 'Quantify risk: click rate vs. industry benchmarks, SPF/DKIM/DMARC gap analysis, and specific recommendations for security awareness training and email gateway hardening.', tools: [] },
  ],
}

const SCENARIO_TARGETS = {
  'SC-01': { name: 'NovaMed Healthcare', network: '172.20.1.0/24', targets: [{ ip: '172.20.1.20', role: 'PHP/Apache webapp' }, { ip: '172.20.1.21', role: 'MySQL DB' }, { ip: '172.20.1.1', role: 'ModSecurity WAF' }] },
  'SC-02': { name: 'Nexora Financial', network: '172.20.2.0/24', targets: [{ ip: '172.20.2.20', role: 'AD Domain Controller' }, { ip: '172.20.2.40', role: 'File Server' }], domain: 'nexora.local', creds: 'jsmith : Welcome1!' },
  'SC-03': { name: 'Orion Logistics', network: '172.20.3.0/24', targets: [{ ip: '172.20.3.40', role: 'GoPhish' }, { ip: '172.20.3.20', role: 'Postfix Mail' }, { ip: '172.20.3.30', role: 'Windows endpoint' }] },
}

function LearningContext({ scenario, phase, methodology }) {
  const entries = CONTEXT[scenario] || []
  const entry = entries.find(e => e.phase === phase) || entries[0]
  const targetInfo = SCENARIO_TARGETS[scenario]

  return (
    <div className="space-y-3 text-xs">
      {/* Target info card */}
      {targetInfo && (
        <div className="border border-gray-800 rounded bg-gray-900/50 p-2.5">
          <p className="text-gray-500 mb-1.5 font-semibold uppercase tracking-wider" style={{ fontSize: '10px' }}>Target Environment</p>
          <p className="text-white font-medium mb-1">{targetInfo.name} <span className="text-gray-500 font-normal">({targetInfo.network})</span></p>
          {targetInfo.domain && <p className="text-cyan-400 mb-1">Domain: {targetInfo.domain}</p>}
          {targetInfo.creds && <p className="text-yellow-400 mb-1">Creds: <code className="bg-gray-800 px-1 rounded">{targetInfo.creds}</code></p>}
          <div className="space-y-0.5 mt-1.5">
            {targetInfo.targets.map(t => (
              <div key={t.ip} className="flex gap-2">
                <code className="text-green-400 font-mono">{t.ip}</code>
                <span className="text-gray-400">{t.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase context */}
      {entry ? (
        <>
          <div>
            <p className="text-gray-500 mb-1">Phase {phase} — {methodology.toUpperCase()}</p>
            <h3 className="text-sm font-medium text-white">{entry.title}</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">{entry.body}</p>
          {entry.tools && entry.tools.length > 0 && (
            <div>
              <p className="text-gray-500 mb-1">Suggested tools:</p>
              <div className="flex gap-1.5 flex-wrap">
                {entry.tools.map(t => (
                  <code key={t} className="text-green-400 bg-green-950 border border-green-900 px-1.5 py-0.5 rounded">{t}</code>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {entry.mitre && (
              <span className="text-purple-400 bg-purple-950 border border-purple-800 px-2 py-0.5 rounded">
                MITRE {entry.mitre}
              </span>
            )}
            {entry.cwe && (
              <span className="text-orange-400 bg-orange-950 border border-orange-800 px-2 py-0.5 rounded">
                {entry.cwe}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-600">No context available for this phase.</p>
      )}
    </div>
  )
}
