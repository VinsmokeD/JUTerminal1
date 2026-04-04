import { useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'

const ROE_CONTENT = {
  'SC-01': {
    title: 'NovaMed Healthcare Portal — Rules of Engagement',
    scope: ['app.novamed.local (172.20.1.20) — all paths and parameters', '/api/v1/ REST API', 'All authentication mechanisms', 'File upload functionality'],
    outOfScope: ['172.20.1.21 (database server) — no direct DB access', 'Any IP outside 172.20.1.0/24', 'Denial of service testing'],
    rules: ['Testing window: Duration of your session only', 'Target 172.20.1.20 ONLY — probing outside scope is a violation', 'Do not delete patient records or modify database tables', 'Document every finding with exact HTTP request + response', 'Stop testing immediately if you reach the database server directly'],
  },
  'SC-02': {
    title: 'Nexora Financial AD — Rules of Engagement',
    scope: ['Domain: nexora.local (172.20.2.0/24)', 'All workstations, servers, and DC in scope', 'Kerberoasting, lateral movement, DCSync permitted'],
    outOfScope: ['Permanent changes to AD objects', 'Disabling the DC itself', 'Actions outside 172.20.2.0/24'],
    rules: ['Starting credentials provided: jsmith / Welcome1!', 'Do NOT create permanent domain admin accounts', 'DCSync only against simulated DC container', 'Stop condition: once DA hash obtained, engagement ends', 'Document every lateral movement step in real time'],
  },
  'SC-03': {
    title: 'Orion Logistics Phishing — Rules of Engagement',
    scope: ['Phishing simulation within 172.20.3.0/24', 'OSINT on simulated Orion Logistics targets', 'GoPhish campaign server at 172.20.3.40'],
    outOfScope: ['Real external email addresses', 'Internet access (network is isolated)', 'Social engineering of real individuals'],
    rules: ['All phishing targets are simulated — no real people', 'Payload must be submitted for analysis before use', 'Track all GoPhish campaign metrics for the report'],
  },
  'SC-04': {
    title: 'StratoStack AWS — Rules of Engagement',
    scope: ['LocalStack environment at 172.20.4.20', 'All S3 buckets, IAM roles, Lambda functions', 'SSRF against webapp at 172.20.4.30'],
    outOfScope: ['Real AWS services', 'Any IP outside 172.20.4.0/24'],
    rules: ['Enumerate before exploiting — document all findings first', 'Do not delete S3 buckets or IAM policies permanently', 'All AWS credentials found must be documented immediately'],
  },
  'SC-05': {
    title: 'Veridian Ransomware IR — Rules of Engagement',
    scope: ['Full 172.20.5.0/24 network', 'Red: deploy simulated ransomware payload on victim-ws', 'Blue: Splunk + Velociraptor at 172.20.5.100-101'],
    outOfScope: ['Real ransomware encryption', 'Actions outside 172.20.5.0/24'],
    rules: ['Red: follow LockBit TTP order — document every step', 'Blue: capture memory BEFORE isolating hosts', 'Both teams must submit IR report at end of session', 'Simulated encryption only — no real file destruction'],
  },
}

export default function RoeBriefing({ session, onAcknowledged }) {
  const [checked, setChecked] = useState(false)
  const { acknowledgeRoe } = useSessionStore()
  const roe = ROE_CONTENT[session.scenario_id] || ROE_CONTENT['SC-01']

  const ack = async () => {
    await acknowledgeRoe(session.id)
    onAcknowledged()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-900 border border-gray-700 rounded-lg">
        <div className="border-b border-gray-700 px-6 py-4">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${session.role === 'red' ? 'bg-red-500' : 'bg-teal-500'}`} />
            <span className={`text-xs font-semibold ${session.role === 'red' ? 'text-red-400' : 'text-teal-400'}`}>
              {session.role === 'red' ? 'RED TEAM — PENETRATION TESTER' : 'BLUE TEAM — SOC ANALYST'}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-white">{roe.title}</h1>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          <div>
            <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">In Scope</h2>
            <ul className="space-y-1">
              {roe.scope.map((s, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-green-600">+</span>{s}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Out of Scope</h2>
            <ul className="space-y-1">
              {roe.outOfScope.map((s, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-red-600">–</span>{s}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">Rules of Engagement</h2>
            <ol className="space-y-1.5 list-decimal list-inside">
              {roe.rules.map((r, i) => <li key={i} className="text-sm text-gray-300">{r}</li>)}
            </ol>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded p-3 text-xs text-gray-400">
            All targets are isolated Docker containers with no internet access. This is an educational simulation — no real systems are affected.
          </div>
        </div>

        <div className="border-t border-gray-700 px-6 py-4">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 cursor-pointer" />
            <span className="text-sm text-gray-300">
              I have read and understood the scope and rules of engagement. I will only test systems within the defined scope.
            </span>
          </label>
          <button
            onClick={ack}
            disabled={!checked}
            className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium text-sm transition-colors"
          >
            Acknowledge &amp; Enter Workspace →
          </button>
        </div>
      </div>
    </div>
  )
}
