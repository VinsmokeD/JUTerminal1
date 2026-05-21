import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import CyberSimNav from '../components/nav/CyberSimNav'
import { Badge, Button, Stat } from '../components/ui'

const KillChainView = lazy(() => import('../components/killchain/KillChainView'))

const TAG_STYLES = {
  finding:     { cls: 'text-cs-red border-cs-red/30 bg-cs-red/5', dot: 'bg-cs-red' },
  evidence:    { cls: 'text-cs-blue border-cs-blue/30 bg-cs-blue/5', dot: 'bg-cs-blue' },
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
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    api.get(`/reports/${sessionId}/report`)
      .then((res) => {
        const { session, score, notes, commands, siem_events, learning_insights } = res.data
        setSession(session)
        setScore(score)
        setNotes(notes || [])
        setCommands(commands || [])
        setSiemEvents(siem_events || [])
        setInsights(learning_insights)
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
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

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 44
    const width = doc.internal.pageSize.getWidth() - margin * 2
    let y = margin
    const addLine = (text, size = 10, gap = 16) => {
      doc.setFontSize(size)
      const lines = doc.splitTextToSize(String(text || ''), width)
      lines.forEach((line) => {
        if (y > 760) {
          doc.addPage()
          y = margin
        }
        doc.text(line, margin, y)
        y += gap
      })
    }

    addLine('CyberSim Mission Debrief', 18, 22)
    addLine(`${session.scenario_id} | ${session.role?.toUpperCase()} Team | Score ${score?.final_score ?? session.score ?? '--'}/100`, 11, 18)
    addLine(`Phase ${session.phase} | Findings ${findings.length} | Evidence ${evidence.length} | Events ${siemEvents.length}`, 10, 18)
    addLine('Summary', 13, 20)
    addLine(session.role === 'red'
      ? `Completed a structured ${session.methodology?.toUpperCase()} assessment with ${findings.length} findings and ${evidence.length} evidence notes.`
      : `Completed incident response review with ${iocs.length} IOCs and ${siemEvents.length} SIEM events.`, 10, 15)
    addLine('Top Findings', 13, 20)
    ;(findings.length ? findings.slice(0, 6) : [{ content: 'No findings tagged in this session.' }]).forEach((finding, index) => {
      addLine(`${index + 1}. ${finding.content}`, 10, 14)
    })
    addLine('Learning Insights', 13, 20)
    const strengths = insights?.coaching?.strengths || []
    const improvements = insights?.coaching?.improvement_areas || []
    addLine(`Strengths: ${strengths.length ? strengths.join('; ') : 'Not available.'}`, 10, 14)
    addLine(`Improve Next: ${improvements.length ? improvements.join('; ') : 'Not available.'}`, 10, 14)
    doc.save(`cybersim-debrief-${sessionId.slice(0, 8)}.pdf`)
  }

  if (loading) return <DebriefLoading />
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'insights', label: 'Insights' },
    { id: 'findings', label: `Findings (${findings.length})` },
    { id: 'timeline', label: 'Kill Chain' },
    { id: 'notes', label: `All Notes (${notes.length})` },
  ]

  return (
    <div className="min-h-screen bg-void text-txt-primary font-display">
      <CyberSimNav />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className={`card-v3 ${gradeBorder} ${gradeBg} p-8 mb-8 relative overflow-hidden`}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isExcellent
                ? 'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(0,255,136,0.04), transparent)'
                : isSatisfactory
                ? 'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(255,170,0,0.04), transparent)'
                : 'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(255,59,59,0.04), transparent)',
            }}
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge tone={session.role === 'red' ? 'red' : 'blue'}>{session.role.toUpperCase()} Team</Badge>
                <span className="text-txt-dim text-xs font-mono">{session.scenario_id}</span>
                <span className="text-txt-dim text-xs font-mono">{session.methodology?.toUpperCase()}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-txt-primary mb-2 font-display">Mission Debrief</h1>
              <p className="text-txt-secondary text-sm max-w-md leading-relaxed">
                {session.role === 'red'
                  ? `Completed ${session.methodology?.toUpperCase()} pentest of ${session.scenario_id} through Phase ${session.phase}. ${findings.length} findings documented with ${evidence.length} evidence items.`
                  : `Incident response for ${session.scenario_id} via NIST 800-61 through Phase ${session.phase}. ${iocs.length} IOCs extracted, ${findings.length} findings documented.`}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6 md:grid-cols-4">
                <Stat label="Phase" value={`${session.phase}`} accent="blue" />
                <Stat label="Findings" value={`${findings.length}`} accent="red" />
                <Stat label="Evidence" value={`${evidence.length}`} accent="blue" />
                <Stat label="Duration" value={sessionDuration ? `${sessionDuration}m` : '--'} accent="neutral" />
              </div>
            </div>

            <ScoreRing score={finalScore} gradeColor={gradeColor} gradeLabel={gradeLabel} />
          </div>

          <div className="relative z-10 flex gap-3 mt-6 pt-6 border-t border-cs-border/30">
            <Button onClick={downloadReport} variant="blue" size="sm">Export report (.md)</Button>
            <Button onClick={downloadPdf} variant="ghost" size="sm">Export PDF</Button>
            <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm">New scenario</Button>
          </div>
        </div>

        <div className="mb-6 border-b border-cs-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-w-fit px-4 py-3 text-sm font-medium border-b-2 transition-colors font-display ${
                  activeTab === tab.id
                    ? 'border-cs-blue text-txt-primary'
                    : 'border-transparent text-txt-dim hover:text-txt-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            {(commands.length > 0 || siemEvents.length > 0) && (
              <div className="card-v3 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-txt-secondary font-mono uppercase tracking-wider">Attack Timeline</h3>
                  <Button onClick={() => setActiveTab('timeline')} variant="ghost" size="sm">View full</Button>
                </div>
                <Suspense fallback={<div className="h-[260px] rounded-cs-lg bg-surface-2/60 border border-cs-border animate-pulse" />}>
                  <KillChainView sessionId={sessionId} role={session.role} />
                </Suspense>              </div>
            )}

            <div className="card-v3 p-5">
              <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono uppercase tracking-wider">Session Summary</h3>
              <p className="text-sm text-txt-secondary leading-relaxed">
                {session.role === 'red'
                  ? `Executed a structured ${session.methodology?.toUpperCase()} penetration test against ${session.scenario_id}, progressing through ${session.phase} phases. Identified ${findings.length} vulnerabilities and collected ${evidence.length} pieces of supporting evidence. Final score: ${finalScore}/100.`
                  : `Performed incident response for ${session.scenario_id} using the NIST 800-61 framework, completing ${session.phase} of 6 phases. Extracted ${iocs.length} indicators of compromise and documented ${findings.length} analytical findings. Final score: ${finalScore}/100.`}
              </p>
            </div>

            {remediations.length > 0 && (
              <NoteGroup title="Remediation Recommendations" notes={remediations} tone="green" ordered />
            )}
            {iocs.length > 0 && (
              <NoteGroup title="Indicators of Compromise" notes={iocs} tone="purple" />
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <InsightsTab insights={insights} />
        )}

        {activeTab === 'findings' && (
          <FindingsTab findings={findings} />
        )}

        {activeTab === 'timeline' && (
          <div className="card-v3 p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-txt-secondary font-mono uppercase tracking-wider">Dual-Axis Kill Chain Timeline</h3>
                <p className="text-xs text-txt-dim mt-0.5">Red team commands vs Blue team detections with detection links</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-txt-dim font-mono">
                <span>{commands.length} commands</span>
                <span>{siemEvents.length} detections</span>
              </div>
            </div>
            {commands.length === 0 && siemEvents.length === 0 ? (
              <EmptyPanel title="No timeline data recorded for this session." body="Commands and SIEM events are captured as you progress through a scenario." />
            ) : (
              <Suspense fallback={<div className="h-[260px] rounded-cs-lg bg-surface-2/60 border border-cs-border animate-pulse" />}>
                <KillChainView sessionId={sessionId} role={session.role} />
              </Suspense>            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <AllNotes notes={notes} />
        )}
      </div>
    </div>
  )
}

function DebriefLoading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <style>{`
        @keyframes debriefPulseA { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.9); } }
        @keyframes debriefPulseB { 0%, 100% { opacity: 0.55; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute left-0 top-0 h-6 w-6 rounded bg-cs-red shadow-red-glow" style={{ animation: 'debriefPulseA 1.4s ease-in-out infinite' }} />
          <div className="absolute bottom-0 right-0 h-6 w-6 rounded bg-cs-blue shadow-blue-glow" style={{ animation: 'debriefPulseB 1.4s ease-in-out infinite' }} />
        </div>
        <span className="text-sm text-txt-dim font-mono">Loading debrief...</span>
      </div>
    </div>
  )
}

function ScoreRing({ score, gradeColor, gradeLabel }) {
  const [ready, setReady] = useState(false)
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, Number(score) || 0))
  const offset = ready ? circumference - (clamped / 100) * circumference : circumference
  const stroke = clamped >= 80 ? '#00ff88' : clamped >= 60 ? '#ffaa00' : '#ff3b3b'

  useEffect(() => {
    const timer = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(timer)
  }, [score])

  return (
    <div className="flex-shrink-0 text-center">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-3 rounded-full bg-surface-1 border border-cs-border flex items-center justify-center">
          <div>
            <div className={`text-4xl font-extrabold font-mono ${gradeColor}`}>{score}</div>
            <div className="text-xs text-txt-dim font-mono">/100</div>
          </div>
        </div>
      </div>
      <div className={`text-sm font-semibold mt-2 ${gradeColor}`}>{gradeLabel}</div>
    </div>
  )
}

function InsightsTab({ insights }) {
  if (!insights) {
    return (
      <div className="card-v3 p-8 text-center">
        <p className="text-txt-dim text-sm font-mono">Learning insights are not available for this session yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Detection coverage" value={`${insights.summary?.detection_coverage_percent ?? 0}%`} accent="blue" />
        <Stat label="Mean latency" value={insights.summary?.mean_detection_latency_seconds == null ? '--' : `${insights.summary.mean_detection_latency_seconds}s`} accent="amber" />
        <Stat label="High-signal alerts" value={insights.summary?.high_signal_detections ?? 0} accent="red" />
        <Stat label="Evidence notes" value={insights.summary?.evidence_items ?? 0} accent="green" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <InsightList title="Strengths" items={insights.coaching?.strengths} tone="green" />
        <InsightList title="Improve Next" items={insights.coaching?.improvement_areas} tone="amber" />
        <InsightList title="Next Practice" items={insights.coaching?.next_practice} tone="blue" />
      </div>

      <div className="card-v3 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-txt-secondary font-mono uppercase tracking-wider">Cause And Effect</h3>
            <p className="text-xs text-txt-dim mt-0.5">How Red Team actions became Blue Team signals</p>
          </div>
          <Badge tone="neutral">{insights.cause_effect?.length || 0} actions</Badge>
        </div>

        {insights.cause_effect?.length ? (
          <div className="space-y-3">
            {insights.cause_effect.slice(0, 12).map((item) => (
              <div key={item.command_id} className="border border-cs-border rounded-cs p-4 bg-surface-2/40">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${item.detected ? 'bg-green-signal' : 'bg-txt-dim'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="text-xs text-cs-blue bg-cs-blue/5 border border-cs-blue/20 rounded-cs-sm px-2 py-1 break-all">
                        {item.command}
                      </code>
                      <span className="text-xs text-txt-dim font-mono">Phase {item.phase}</span>
                      {item.tool && <span className="text-xs text-txt-dim font-mono">tool:{item.tool}</span>}
                    </div>
                    <p className="text-sm text-txt-secondary leading-relaxed">{item.system_effect}</p>
                    <p className="text-xs text-amber-warn mt-2 font-mono">{item.blue_team_question}</p>
                    {item.related_events?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {item.related_events.map((event) => (
                          <div key={event.id} className="flex items-start gap-2 text-xs border border-cs-border/60 rounded-cs-sm px-2 py-1.5 bg-void/40">
                            <span className="text-cs-red font-mono flex-shrink-0">{event.severity}</span>
                            <span className="text-txt-secondary flex-1">{event.message}</span>
                            <span className="text-txt-dim font-mono flex-shrink-0">{event.detection_latency_seconds}s</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel title="Run mission commands to populate cause-and-effect insights." />
        )}
      </div>
    </div>
  )
}

function InsightList({ title, items = [], tone }) {
  const palette = {
    green: 'text-green-signal',
    amber: 'text-amber-warn',
    blue: 'text-cs-blue',
  }[tone] || 'text-txt-secondary'

  return (
    <div className="card-v3 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${palette}`}>{title}</h3>
        <Badge tone={tone || 'neutral'}>{items.length}</Badge>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${title}-${index}`} className="flex gap-2 text-xs text-txt-secondary leading-relaxed">
              <span className="font-mono opacity-70">{index + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-txt-dim">No signal yet.</p>
      )}
    </div>
  )
}

function FindingsTab({ findings }) {
  if (findings.length === 0) {
    return <EmptyPanel title="No findings were tagged during this session." body="Tag notes as #finding during your next session to include them in the report." />
  }
  return (
    <div className="space-y-3">
      {findings.map((finding, index) => (
        <div key={finding.id} className="card-v3 border-cs-red/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cs-red flex-shrink-0" />
            <span className="text-xs font-bold text-cs-red font-mono">FINDING #{index + 1}</span>
            <span className="text-xs text-txt-dim font-mono">Phase {finding.phase}</span>
            <span className="text-xs text-txt-dim font-mono ml-auto">{new Date(finding.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-txt-primary whitespace-pre-wrap leading-relaxed">{finding.content}</p>
        </div>
      ))}
    </div>
  )
}

function NoteGroup({ title, notes, tone, ordered = false }) {
  const color = tone === 'green' ? 'text-green-signal' : 'text-purple-400'
  return (
    <div className="card-v3 p-5">
      <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-mono uppercase tracking-wider">{title}</h3>
      <div className="space-y-2">
        {notes.map((note, index) => (
          <div key={note.id} className="flex gap-3 text-sm text-txt-secondary">
            <span className={`${color} font-mono font-bold flex-shrink-0`}>{ordered ? `${index + 1}.` : '#'}</span>
            <span className="leading-relaxed">{note.content}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AllNotes({ notes }) {
  if (notes.length === 0) return <EmptyPanel title="No notes recorded during this session." />
  return (
    <div className="space-y-2">
      {notes.map(note => {
        const ts = TAG_STYLES[note.tag] || TAG_STYLES.note
        return (
          <div key={note.id} className={`rounded-cs border px-4 py-3 ${ts.cls}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ts.dot}`} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-60 font-mono">#{note.tag}</span>
              <span className="text-txt-dim text-xs font-mono">Phase {note.phase}</span>
              <span className="text-txt-dim text-xs font-mono ml-auto">{new Date(note.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm text-txt-primary whitespace-pre-wrap leading-relaxed">{note.content}</p>
          </div>
        )
      })}
    </div>
  )
}

function EmptyPanel({ title, body }) {
  return (
    <div className="card-v3 p-8 text-center">
      <p className="text-txt-dim text-sm font-mono">{title}</p>
      {body && <p className="text-txt-dim/60 text-xs mt-1">{body}</p>}
    </div>
  )
}
