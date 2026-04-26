import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import KillChainTimeline from '../components/debrief/KillChainTimeline'
import CyberSimNav from '../components/nav/CyberSimNav'

const TAG_STYLES = {
  finding:     { cls: 'text-cs-red border-cs-red/30 bg-cs-red/5',           dot: 'bg-cs-red' },
  evidence:    { cls: 'text-cs-blue border-cs-blue/30 bg-cs-blue/5',        dot: 'bg-cs-blue' },
  ioc:         { cls: 'text-purple-400 border-purple-400/30 bg-purple-400/5', dot: 'bg-purple-400' },
  remediation: { cls: 'text-green-signal border-green-signal/30 bg-green-signal/5', dot: 'bg-green-signal' },
  todo:        { cls: 'text-amber-warn border-amber-warn/30 bg-amber-warn/5', dot: 'bg-amber-warn' },
  note:        { cls: 'text-txt-secondary border-cs-border bg-surface-2/50', dot: 'bg-txt-dim' },
}

export default function Debrief() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [score, setScore] = useState(null)
  const [notes, setNotes] = useState([])
  const [commands, setCommands] = useState([])
  const [siemEvents, setSiemEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    Promise.all([
      api.get(`/sessions/${sessionId}`),
      api.get(`/scoring/${sessionId}`),
      api.get(`/notes/${sessionId}`).catch(() => ({ data: [] })),
      api.get(`/sessions/${sessionId}/commands`).catch(() => ({ data: [] })),
      api.get(`/sessions/${sessionId}/events`).catch(() => ({ data: [] })),
    ]).then(([sessRes, scoreRes, notesRes, cmdsRes, evtsRes]) => {
      setSession(sessRes.data)
      setScore(scoreRes.data)
      setNotes(notesRes.data || [])
      setCommands(cmdsRes.data || [])
      setSiemEvents(evtsRes.data || [])
    }).catch(() => navigate('/')).finally(() => setLoading(false))
  }, [sessionId, navigate])

  const downloadReport = async () => {
    const res = await api.get(`/reports/${sessionId}`)
    const blob = new Blob([res.data], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cybersim-report-${sessionId.slice(0, 8)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex items-center gap-3 text-txt-dim">
          <div className="w-4 h-4 border-2 border-cs-border border-t-cs-blue rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading debrief...</span>
        </div>
      </div>
    )
  }
  if (!session) return null

  const finalScore = score?.final_score ?? session.score
  const isExcellent = finalScore >= 80
  const isSatisfactory = finalScore >= 60

  const gradeLabel = isExcellent ? 'Excellent' : isSatisfactory ? 'Satisfactory' : 'Needs Improvement'
  const gradeColor = isExcellent ? 'text-green-signal' : isSatisfactory ? 'text-amber-warn' : 'text-cs-red'
  const gradeBorder = isExcellent ? 'border-green-signal/20' : isSatisfactory ? 'border-amber-warn/20' : 'border-cs-red/20'
  const gradeBg = isExcellent ? 'bg-green-signal/5' : isSatisfactory ? 'bg-amber-warn/5' : 'bg-cs-red/5'

  const findings = notes.filter(n => n.tag === 'finding')
  const evidence = notes.filter(n => n.tag === 'evidence')
  const iocs = notes.filter(n => n.tag === 'ioc')
  const remediations = notes.filter(n => n.tag === 'remediation')

  const sessionDuration = session.completed_at
    ? Math.round((new Date(session.completed_at) - new Date(session.started_at)) / 60000)
    : null

  return (
    <div className="min-h-screen bg-void text-txt-primary font-display">
      <CyberSimNav />

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Score hero ──────────────────────────────────────────────── */}
        <div className={`rounded-cs-lg border ${gradeBorder} ${gradeBg} p-8 mb-8 relative overflow-hidden`}>
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: isExcellent
              ? 'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(0,255,136,0.04), transparent)'
              : isSatisfactory
              ? 'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(255,170,0,0.04), transparent)'
              : 'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(255,59,59,0.04), transparent)',
          }} />

          <div className="relative z-10 flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-cs-sm border ${
                  session.role === 'red' ? 'text-cs-red border-cs-red/30 bg-cs-red/10' : 'text-cs-blue border-cs-blue/30 bg-cs-blue/10'
                }`}>
                  {session.role.toUpperCase()} TEAM
                </span>
                <span className="text-txt-dim text-xs font-mono">{session.scenario_id}</span>
                <span className="text-txt-dim text-xs font-mono">·</span>
                <span className="text-txt-dim text-xs font-mono">{session.methodology?.toUpperCase()}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-txt-primary mb-2 tracking-tight">Mission Debrief</h1>
              <p className="text-txt-secondary text-sm max-w-md leading-relaxed">
                {session.role === 'red'
                  ? `Completed ${session.methodology?.toUpperCase()} pentest of ${session.scenario_id} through Phase ${session.phase}. ${findings.length} findings documented with ${evidence.length} evidence items.`
                  : `Incident response for ${session.scenario_id} via NIST 800-61 through Phase ${session.phase}. ${iocs.length} IOCs extracted, ${findings.length} findings documented.`}
              </p>

              <div className="grid grid-cols-4 gap-3 mt-6">
                {[
                  { label: 'Final Phase', value: `${session.phase}` },
                  { label: 'Findings', value: `${findings.length}` },
                  { label: 'Evidence', value: `${evidence.length}` },
                  { label: 'Duration', value: sessionDuration ? `${sessionDuration}m` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-2/60 border border-cs-border rounded-cs px-3 py-2.5 text-center">
                    <div className="text-lg font-bold text-txt-primary font-mono">{value}</div>
                    <div className="text-xs text-txt-dim mt-0.5 font-mono">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score ring */}
            <div className="flex-shrink-0 text-center">
              <div className={`relative w-28 h-28 rounded-full border-4 ${gradeBorder} flex items-center justify-center bg-surface-1`}>
                <div>
                  <div className={`text-4xl font-extrabold font-mono ${gradeColor}`}>{finalScore}</div>
                  <div className="text-xs text-txt-dim font-mono">/100</div>
                </div>
              </div>
              <div className={`text-sm font-semibold mt-2 ${gradeColor}`}>{gradeLabel}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="relative z-10 flex gap-3 mt-6 pt-6 border-t border-cs-border/30">
            <button onClick={downloadReport}
              className="btn btn-blue btn-sm text-xs">
              Export report (.md)
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="btn btn-ghost btn-sm text-xs">
              New scenario
            </button>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-surface-2 rounded-cs p-1 border border-cs-border">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'findings', label: `Findings (${findings.length})` },
            { id: 'timeline', label: 'Kill Chain' },
            { id: 'notes', label: `All Notes (${notes.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-cs-sm text-sm font-medium transition-all font-display ${
                activeTab === tab.id
                  ? 'bg-surface-4 text-txt-primary shadow-sm'
                  : 'text-txt-dim hover:text-txt-secondary'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ───────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Attack timeline preview */}
            {(commands.length > 0 || siemEvents.length > 0) && (
              <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-txt-secondary font-mono uppercase tracking-wider">Attack Timeline</h3>
                  <button onClick={() => setActiveTab('timeline')} className="text-xs text-cs-blue hover:text-cs-blue/80 font-mono transition-colors">
                    View full →
                  </button>
                </div>
                <KillChainTimeline commands={commands} siemEvents={siemEvents} />
              </div>
            )}

            {/* Summary card */}
            <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-5">
              <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono uppercase tracking-wider">Session Summary</h3>
              <p className="text-sm text-txt-secondary leading-relaxed">
                {session.role === 'red'
                  ? `Executed a structured ${session.methodology?.toUpperCase()} penetration test against ${session.scenario_id}, progressing through ${session.phase} phases. Identified ${findings.length} vulnerabilities and collected ${evidence.length} pieces of supporting evidence. Final score: ${finalScore}/100.`
                  : `Performed incident response for ${session.scenario_id} using the NIST 800-61 framework, completing ${session.phase} of 6 phases. Extracted ${iocs.length} indicators of compromise and documented ${findings.length} analytical findings. Final score: ${finalScore}/100.`}
              </p>
            </div>

            {remediations.length > 0 && (
              <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-5">
                <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono uppercase tracking-wider">Remediation Recommendations</h3>
                <div className="space-y-2">
                  {remediations.map((r, i) => (
                    <div key={r.id} className="flex gap-3 text-sm text-txt-secondary">
                      <span className="text-green-signal font-mono font-bold flex-shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{r.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {iocs.length > 0 && (
              <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-5">
                <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono uppercase tracking-wider">Indicators of Compromise</h3>
                <div className="space-y-1">
                  {iocs.map(n => (
                    <div key={n.id} className="text-xs font-mono text-purple-400 bg-purple-400/5 border border-purple-400/20 rounded-cs-sm px-2.5 py-1.5">
                      {n.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Findings ───────────────────────────────────────────── */}
        {activeTab === 'findings' && (
          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-8 text-center">
                <p className="text-txt-dim text-sm font-mono">No findings were tagged during this session.</p>
                <p className="text-txt-dim/60 text-xs mt-1">Tag notes as #finding during your next session to include them in the report.</p>
              </div>
            ) : (
              findings.map((f, i) => (
                <div key={f.id} className="bg-surface-1 border border-cs-red/20 rounded-cs-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cs-red flex-shrink-0" />
                    <span className="text-xs font-bold text-cs-red font-mono">FINDING #{i + 1}</span>
                    <span className="text-xs text-txt-dim font-mono">Phase {f.phase}</span>
                    <span className="text-xs text-txt-dim font-mono ml-auto">{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-txt-primary whitespace-pre-wrap leading-relaxed">{f.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: Kill Chain Timeline ─────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-txt-secondary font-mono uppercase tracking-wider">Dual-Axis Kill Chain Timeline</h3>
                <p className="text-xs text-txt-dim mt-0.5">Red team commands vs Blue team detections — with detection latency annotations</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-txt-dim font-mono">
                <span>{commands.length} commands</span>
                <span>·</span>
                <span>{siemEvents.length} detections</span>
              </div>
            </div>
            {commands.length === 0 && siemEvents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-txt-dim text-sm font-mono">No timeline data recorded for this session.</p>
                <p className="text-txt-dim/60 text-xs mt-1">Commands and SIEM events are captured as you progress through a scenario.</p>
              </div>
            ) : (
              <KillChainTimeline commands={commands} siemEvents={siemEvents} />
            )}
          </div>
        )}

        {/* ── Tab: All Notes ───────────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <div className="space-y-2">
            {notes.length === 0 ? (
              <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-8 text-center">
                <p className="text-txt-dim text-sm font-mono">No notes recorded during this session.</p>
              </div>
            ) : (
              notes.map(n => {
                const ts = TAG_STYLES[n.tag] || TAG_STYLES.note
                return (
                  <div key={n.id} className={`rounded-cs border px-4 py-3 ${ts.cls}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ts.dot}`} />
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-60 font-mono">#{n.tag}</span>
                      <span className="text-txt-dim text-xs font-mono">Phase {n.phase}</span>
                      <span className="text-txt-dim text-xs font-mono ml-auto">{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-txt-primary whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
