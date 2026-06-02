import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import ParallaxNav from '../components/nav/ParallaxNav'
import { Badge, Button, Stat } from '../components/ui'
import { useReducedMotionSafe, staggerItem } from '../lib/motion'

const KillChainView = lazy(() => import('../components/killchain/KillChainView'))

const TAG_STYLES = {
  finding:     { cls: 'text-cs-red border-cs-red/30 bg-cs-red/5', dot: 'bg-cs-red' },
  evidence:    { cls: 'text-cs-blue border-cs-blue/30 bg-cs-blue/5', dot: 'bg-cs-blue' },
  ioc:         { cls: 'text-purple-400 border-purple-400/30 bg-purple-400/5', dot: 'bg-purple-400' },
  remediation: { cls: 'text-green-signal border-green-signal/30 bg-green-signal/5', dot: 'bg-green-signal' },
  todo:        { cls: 'text-amber-warn border-amber-warn/30 bg-amber-warn/5', dot: 'bg-amber-warn' },
  note:        { cls: 'text-txt-secondary border-cs-border bg-surface-2/50', dot: 'bg-txt-dim' },
}

function ScoreBreakdown({ hintPenalty, gatePenalty, timeBonus, finalScore }) {
  const reduced = useReducedMotionSafe()

  const items = [
    { label: 'Starting Score', value: 100, color: 'bg-txt-dim/50' },
    { label: 'Hint Penalties', value: hintPenalty > 0 ? -hintPenalty : 0, color: 'bg-critical' },
    { label: 'Gate & ROE Penalties', value: gatePenalty > 0 ? -gatePenalty : 0, color: 'bg-cs-red' },
    { label: 'Time / Speed Bonus', value: timeBonus > 0 ? `+${timeBonus}` : 0, color: 'bg-green-signal' },
    { label: 'Final Score', value: finalScore, color: 'bg-cs-blue', isFinal: true },
  ].filter(item => item.value !== 0)

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const barVariants = {
    hidden: { scaleX: 0, originX: 0 },
    visible: {
      scaleX: 1,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial={reduced ? 'visible' : 'hidden'}
      animate="visible"
      className="space-y-3 mt-6 border-t border-cs-border/30 pt-4"
    >
      <h4 className="text-xs font-mono text-txt-dim uppercase tracking-wider mb-2">Score Breakdown</h4>
      <div className="space-y-2 max-w-md">
        {items.map((item, idx) => {
          const valNum = typeof item.value === 'string' ? parseInt(item.value, 10) : item.value
          const absVal = Math.abs(valNum)
          const pct = Math.max(2, Math.min(100, absVal))

          return (
            <motion.div
              key={idx}
              variants={staggerItem}
              className="space-y-1"
            >
              <div className="flex justify-between text-[11px] font-mono">
                <span className={item.isFinal ? 'text-txt-primary font-bold' : 'text-txt-secondary'}>
                  {item.label}
                </span>
                <span className={item.isFinal ? 'text-cs-blue font-bold' : valNum < 0 ? 'text-cs-red' : valNum > 0 && !item.isFinal ? 'text-green-signal' : 'text-txt-primary'}>
                  {item.value}
                </span>
              </div>
              <div className="h-1 w-full bg-surface-3 rounded-full overflow-hidden relative">
                <motion.div
                  variants={barVariants}
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function ShareModal({ session, score, gradeLabel, onClose }) {
  const reduced = useReducedMotionSafe()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 backdrop-blur-md">
      {/* Left curtain panel */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-1/2"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={reduced ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
        style={{
          background: 'linear-gradient(90deg, #070408, #0d060b)',
          borderRight: '1px solid rgba(255,59,59,0.18)',
        }}
      />
      {/* Right curtain panel */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-1/2"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={reduced ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
        style={{
          background: 'linear-gradient(270deg, #040710, #060b16)',
          borderLeft: '1px solid rgba(76,194,255,0.18)',
        }}
      />

      {/* Scoped print stylesheet â€” only the dossier card prints */}
      <style>{`
        @media print {
          body > *:not(#cs-print-dossier-root) { display: none !important; }
          #cs-print-dossier-root { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: white; }
          #cs-print-dossier { color: black; border: 2px solid #333; padding: 2rem; max-width: 480px; margin: auto; font-family: monospace; }
        }
      `}</style>
      <div id="cs-print-dossier-root" style={{ display: 'contents' }}>

      {/* Main certificate card */}
      <motion.div
        id="cs-print-dossier"
        initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 max-w-md w-full glass p-8 border border-cs-border text-center space-y-6 bg-surface-1/90"
      >
        <div className="flex items-center justify-center gap-3">
          <img src="/brand/parallax-icon.svg" alt="" aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
          <span className="font-mono text-[9px] tracking-[0.25em] text-txt-dim">PARALLAX OPERATOR DOSSIER</span>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-extrabold tracking-tight text-txt-primary">COMMISSION VERDICT</h3>
          <p className="text-[10px] text-txt-secondary uppercase tracking-widest font-mono">
            {session.scenario_id} // {session.role === 'red' ? 'RED TEAM' : 'BLUE TEAM'}
          </p>
        </div>

        <div className="py-5 border-y border-cs-border/40 space-y-1.5">
          <div className="text-4xl font-mono font-extrabold text-cs-blue tracking-tighter">
            {score}/100
          </div>
          <div className="text-xs font-semibold tracking-wider text-green-signal uppercase">
            {gradeLabel}
          </div>
        </div>

        <p className="text-xs text-txt-secondary leading-relaxed max-w-xs mx-auto font-display">
          This dossier records the successful completion of training under Parallax's sandboxed environment.
          All simulated operations adhered to methodology parameters.
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={onClose} variant="ghost" size="sm">Dismiss</Button>
          <Button onClick={() => window.print()} variant="blue" size="sm">Print Dossier</Button>
        </div>
      </motion.div>
      </div>
    </div>
  )
}

export default function Debrief() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [score, setScore] = useState(null)
  const [notes, setNotes] = useState([])
  const [commands, setCommands] = useState([])
  const [siemEvents, setSiemEvents] = useState([])
  const [triage, setTriage] = useState([])
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // AI Coach state
  const [coachingData, setCoachingData] = useState(null)
  const [coachingLoading, setCoachingLoading] = useState(false)
  const [qaHistory, setQaHistory] = useState([])
  const [qaRemaining, setQaRemaining] = useState(3)
  const [qaLoading, setQaLoading] = useState(false)
  const [questionInput, setQuestionInput] = useState('')
  const [hoveredMetric, setHoveredMetric] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const retryScenario = async () => {
    if (!window.confirm('This will reset your progress to Phase 1. Your previous debrief report will be saved. Continue?')) return
    setRetrying(true)
    try {
      await api.post(`/sessions/${sessionId}/restart`)
      navigate(`/session/${sessionId}/${session.role}`)
    } catch (e) {
      console.error(e)
      window.alert('Failed to restart scenario')
    } finally {
      setRetrying(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.get(`/reports/${sessionId}/report`)
        if (cancelled) return
        const { session, score, notes, commands, siem_events, triage, learning_insights } = res.data
        // Safety net: if the mission reached the debrief without being ended
        // (e.g. via the command palette or a direct link), terminate the
        // sandbox machine(s) and finalize the session now. Idempotent backend.
        if (session && !session.completed_at) {
          try {
            const endRes = await api.post(`/sessions/${sessionId}/end`)
            if (endRes.data?.completed_at) session.completed_at = endRes.data.completed_at
          } catch {
            // non-fatal — report still renders
          }
        }
        setSession(session)
        setScore(score)
        setNotes(notes || [])
        setCommands(commands || [])
        setSiemEvents(siem_events || [])
        setTriage(triage || [])
        setInsights(learning_insights)
      } catch {
        if (!cancelled) navigate('/')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId, navigate])

  const fetchCoaching = useCallback(() => {
    if (coachingData) return
    setCoachingLoading(true)
    api.post(`/reports/${sessionId}/debrief-coaching`)
      .then((res) => {
        setCoachingData(res.data)
      })
      .catch((err) => console.error("Error loading coaching:", err))
      .finally(() => setCoachingLoading(false))
  }, [coachingData, sessionId])

  useEffect(() => {
    if (activeTab === 'coaching') {
      fetchCoaching()
    }
  }, [activeTab, fetchCoaching])

  const submitQuestion = (text) => {
    const q = text || questionInput
    if (!q.trim() || qaRemaining <= 0 || qaLoading) return
    
    setQaLoading(true)
    setQuestionInput('')
    
    const tempHistory = [...qaHistory, { sender: 'student', text: q }]
    setQaHistory(tempHistory)

    api.post(`/reports/${sessionId}/debrief-qa`, { question: q })
      .then((res) => {
        setQaHistory([...tempHistory, { sender: 'coach', text: res.data.response }])
        setQaRemaining(res.data.remaining)
      })
      .catch((err) => {
        console.error("Error asking Q&A:", err)
        setQaHistory([...tempHistory, { sender: 'coach', text: "The coach was unable to respond at this time. Please try again." }])
      })
      .finally(() => setQaLoading(false))
  }

  const downloadReport = async () => {
    const res = await api.get(`/reports/${sessionId}`)
    const blob = new Blob([res.data], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parallax-report-${sessionId.slice(0, 8)}.md`
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

    addLine('Parallax Mission Debrief', 18, 22)
    addLine(`${session.scenario_id} | ${session.role === 'red' ? 'Red' : 'Blue'} Team | Score ${score?.final_score ?? session.score ?? '--'}/100`, 11, 18)
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
    doc.save(`parallax-debrief-${sessionId.slice(0, 8)}.pdf`)
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

  // Radar metrics calculations
  const sessionDurationSec = session.completed_at && session.started_at
    ? Math.round((new Date(session.completed_at) - new Date(session.started_at)) / 1000)
    : 1800
  const offensive_speed = Math.max(0, Math.min(100, 100 - (sessionDurationSec - 1800) / 60))

  const triagedCount = triage ? triage.filter(t => t.classification === 'true_positive' || t.classification === 'false_positive').length : 0
  const totalSiem = siemEvents ? siemEvents.length : 0
  const defensive_response = totalSiem > 0 ? (triagedCount / totalSiem) * 100 : 0

  const word_count = notes.reduce((acc, note) => {
    const words = note.content ? note.content.trim().split(/\s+/).filter(Boolean).length : 0
    return acc + words
  }, 0)
  const documentation_quality = Math.min(100, notes.length * 20 + word_count / 10)

  const gate_blocks = commands.filter(c => c.tool && c.tool.startsWith('gate_block:')).length
  const methodology_adherence = Math.max(0, 100 - (gate_blocks * 10))

  const hintsUsed = session.hints_used || []
  const hints_l1 = hintsUsed.filter(h => h.level === 1).length
  const hints_l2 = hintsUsed.filter(h => h.level === 2).length
  const hints_l3 = hintsUsed.filter(h => h.level === 3).length
  const resourcefulness = Math.max(0, 100 - (hints_l1 * 5 + hints_l2 * 10 + hints_l3 * 20))

  const highAlertsCount = siemEvents ? siemEvents.filter(e => e.severity === 'high' || e.severity === 'critical').length : 0
  const triagedHighCount = triage && siemEvents ? triage.filter(t => {
    const ev = siemEvents.find(e => e.id === t.event_id)
    return ev && (ev.severity === 'high' || ev.severity === 'critical')
  }).length : 0
  const triageCoverage = highAlertsCount > 0 ? Math.round((triagedHighCount / highAlertsCount) * 100) : 100

  const metrics = [
    { name: 'Offensive Speed', value: Math.round(offensive_speed), label: 'Offensive Speed', framework: 'MITRE ATT&CK Execution', link: 'https://attack.mitre.org/', desc: `Based on a 30m benchmark. Your time: ${Math.round(sessionDurationSec / 60)}m.` },
    { name: 'Defensive Response', value: Math.round(defensive_response), label: 'Defensive Response', framework: 'NIST SP 800-61 / D3FEND', link: 'https://d3fend.mitre.org/', desc: `Triaged ${triagedCount} out of ${totalSiem} SIEM events.` },
    { name: 'Documentation Quality', value: Math.round(documentation_quality), label: 'Documentation Quality', framework: 'OSSTMM / PTES Reporting', link: 'http://www.pentest-standard.org/index.php/Reporting', desc: `Documented ${notes.length} notes with ${word_count} total words.` },
    { name: 'Methodology Adherence', value: Math.round(methodology_adherence), label: 'Methodology Adherence', framework: 'PTES / NIST Methodology', link: 'http://www.pentest-standard.org/', desc: `Triggered ${gate_blocks} tool execution blocks by skipping phases.` },
    { name: 'Resourcefulness', value: Math.round(resourcefulness), label: 'Resourcefulness', framework: 'Self-Reliance & Strategy', link: null, desc: `Used ${hintsUsed.length} hints (L1: ${hints_l1}, L2: ${hints_l2}, L3: ${hints_l3}).` },
  ]

  const sortedMetrics = [...metrics].sort((a, b) => a.value - b.value)
  const lowestMetric = sortedMetrics[0]

  const getSuggestions = (lowestName) => {
    switch (lowestName) {
      case 'Methodology Adherence':
        return [
          "Why did my scan get blocked by the methodology gate?",
          "How can I better align my scan sequencing with the PTES framework?",
          "What step did I skip in the enumeration phase before attempting exploitation?"
        ]
      case 'Defensive Response':
        return [
          "How can I improve my SIEM alert classification and triage?",
          "What signatures did my actions trigger that I failed to acknowledge?",
          "How do I distinguish true positive attacks from background noise in logs?"
        ]
      case 'Documentation Quality':
        return [
          "How does thorough note-taking help during an incident response?",
          "What key indicators of compromise (IOCs) should I have documented?",
          "How can I structure my findings to make them more actionable for a client?"
        ]
      case 'Resourcefulness':
        return [
          "How can I figure out the next step without relying on Level 3 hints?",
          "What recon information did I overlook that could have guided me?",
          "What are the common strategies to troubleshoot connection blocks?"
        ]
      case 'Offensive Speed':
      default:
        return [
          "How can I optimize my scanning to be more time-efficient?",
          "What commands or procedures wasted the most time during my operations?",
          "How does automated tool configuration affect my overall assessment speed?"
        ]
    }
  }
  const suggestions = getSuggestions(lowestMetric?.name)

  const getCoords = (index, value) => {
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2
    const x = 150 + 100 * (value / 100) * Math.cos(angle)
    const y = 150 + 100 * (value / 100) * Math.sin(angle)
    return { x, y }
  }

  const getLabelCoords = (index) => {
    let xOffset = 0
    let yOffset = 0
    
    if (index === 0) {
      yOffset = -8
    } else if (index === 1) {
      xOffset = 10
      yOffset = 4
    } else if (index === 2) {
      xOffset = 10
      yOffset = 10
    } else if (index === 3) {
      xOffset = -10
      yOffset = 10
    } else if (index === 4) {
      xOffset = -10
      yOffset = 4
    }

    const { x, y } = getCoords(index, 115)
    return { x: x + xOffset, y: y + yOffset }
  }

  const gridLevels = [20, 40, 60, 80, 100]

  const pointsStr = (val) => {
    return Array.from({ length: 5 })
      .map((_, i) => {
        const { x, y } = getCoords(i, val)
        return `${x},${y}`
      })
      .join(' ')
  }

  const dataPoints = metrics.map((m, i) => {
    const { x, y } = getCoords(i, m.value)
    return `${x},${y}`
  }).join(' ')

  const sessionDuration = session.completed_at
    ? Math.round((new Date(session.completed_at) - new Date(session.started_at)) / 60000)
    : null

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'insights', label: 'Insights' },
    { id: 'coaching', label: 'AI Coach' },
    { id: 'findings', label: `Findings (${findings.length})` },
    { id: 'timeline', label: 'Kill Chain' },
    { id: 'notes', label: `All Notes (${notes.length})` },
  ]

  return (
    <div className="min-h-dvh bg-void text-txt-primary">
      <ParallaxNav />

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
                <Badge tone={session.role === 'red' ? 'red' : 'blue'}>{session.role === 'red' ? 'Red' : 'Blue'} Team</Badge>
                <span className="text-txt-dim text-xs font-mono">{session.scenario_id}</span>
                <span className="text-txt-dim text-xs font-display">{session.methodology?.toUpperCase()}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-txt-primary mb-2 font-hud">Mission Debrief</h1>
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

              {/* Prefer structured backend breakdown; fall back to client-side math
                  for older sessions that predate the score_breakdown field. */}
              <ScoreBreakdown
                hintPenalty={score?.score_breakdown?.hint_penalty
                  ?? (hintsUsed.length > 0 ? hints_l1 * 5 + hints_l2 * 10 + hints_l3 * 20 : 0)}
                gatePenalty={score?.score_breakdown?.gate_penalty
                  ?? Math.max(0, 100 - (score?.base_score ?? session.score) - (hints_l1 * 5 + hints_l2 * 10 + hints_l3 * 20))}
                timeBonus={score?.score_breakdown?.time_bonus
                  ?? Math.max(0, finalScore - (score?.base_score ?? session.score))}
                finalScore={finalScore}
              />
            </div>

            <ScoreRing score={finalScore} gradeColor={gradeColor} gradeLabel={gradeLabel} />
          </div>

          <div className="relative z-10 flex gap-3 mt-6 pt-6 border-t border-cs-border/30">
            <Button onClick={downloadReport} variant="blue" size="sm">Export report (.md)</Button>
            <Button onClick={downloadPdf} variant="ghost" size="sm">Export PDF</Button>
            <Button onClick={() => setShowShareModal(true)} variant="ghost" size="sm">Share Dossier</Button>
            <Button onClick={retryScenario} disabled={retrying} variant="ghost" size="sm">
              {retrying ? 'Retrying...' : 'Retry this scenario'}
            </Button>
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
                  <h3 className="text-sm font-semibold text-txt-secondary font-display normal-case">Attack Timeline</h3>
                  <Button onClick={() => setActiveTab('timeline')} variant="ghost" size="sm">View full</Button>
                </div>
                <Suspense fallback={<div className="h-[260px] rounded-cs-lg bg-surface-2/60 border border-cs-border animate-pulse" />}>
                  <KillChainView sessionId={sessionId} role={session.role} />
                </Suspense>              </div>
            )}

            <div className="card-v3 p-5">
              <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-display normal-case">Session Summary</h3>
              <p className="text-sm text-txt-secondary leading-relaxed">
                {session.role === 'red'
                  ? `Executed a structured ${session.methodology?.toUpperCase()} penetration test against ${session.scenario_id}, progressing through ${session.phase} phases. Identified ${findings.length} vulnerabilities and collected ${evidence.length} pieces of supporting evidence. Final score: ${finalScore}/100.`
                  : `Performed incident response for ${session.scenario_id} using the NIST 800-61 framework, completing ${session.phase} of 6 phases. Extracted ${iocs.length} indicators of compromise and documented ${findings.length} analytical findings. Final score: ${finalScore}/100.`}
              </p>
            </div>

            <div className="card-v3 p-5">
              <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case">Operations Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-cs-border/30">
                {/* Red Team Column */}
                <div className="pb-4 md:pb-0 md:pr-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-cs-red shadow-red-glow" />
                    <h4 className="text-xs font-bold font-mono tracking-wider text-txt-secondary uppercase">Red Team (Offensive)</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-cs-red">{findings.length}</div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">Vulnerabilities</div>
                    </div>
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-txt-primary">{evidence.length}</div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">Evidence Collects</div>
                    </div>
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-txt-primary">{commands.length}</div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">Commands Run</div>
                    </div>
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-amber-warn">{gate_blocks}</div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">Gate Blocks</div>
                    </div>
                  </div>
                </div>

                {/* Blue Team Column */}
                <div className="pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-cs-blue shadow-blue-glow" />
                    <h4 className="text-xs font-bold font-mono tracking-wider text-txt-secondary uppercase">Blue Team (Defensive)</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-cs-blue">{triage.length}</div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">Triaged Alerts</div>
                    </div>
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-txt-primary">
                        {highAlertsCount > 0 ? `${triageCoverage}%` : '100%'}
                      </div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">Triage Coverage</div>
                    </div>
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-txt-primary">
                        {insights?.summary?.mean_detection_latency_seconds != null ? `${insights.summary.mean_detection_latency_seconds}s` : '--'}
                      </div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">Mean Latency</div>
                    </div>
                    <div className="bg-surface-2/30 border border-cs-border/40 rounded-cs p-3 text-center">
                      <div className="text-2xl font-mono font-bold text-txt-primary">{iocs.length}</div>
                      <div className="text-[10px] text-txt-dim uppercase tracking-wider font-mono">IOCs Extracted</div>
                    </div>
                  </div>
                </div>
              </div>
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
                <h3 className="text-sm font-semibold text-txt-secondary font-display normal-case">Dual-Axis Kill Chain Timeline</h3>
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

        {activeTab === 'coaching' && (
          <div className="space-y-6">
            {coachingLoading || !coachingData ? (
              <div className="card-v3 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cs-blue mb-4"></div>
                <p className="text-txt-secondary text-sm font-mono">Generating Socratic coaching session...</p>
              </div>
            ) : (
              <>
                {/* Top: Summary and Radar Chart */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Radar Chart Panel */}
                  <div className="card-v3 p-5 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case self-start">Competency Radar</h3>
                    
                    <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                      <svg width="300" height="300" className="overflow-visible"
                        role="img"
                        aria-label={`Competency radar: ${metrics.map(m => `${m.name} ${m.value}%`).join(', ')}`}>
                        {/* Background grids */}
                        {gridLevels.map((level) => (
                          <polygon
                            key={level}
                            points={pointsStr(level)}
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="1"
                          />
                        ))}
                        
                        {/* Axis lines and labels */}
                        {metrics.map((m, i) => {
                          const outer = getCoords(i, 100)
                          const label = getLabelCoords(i)
                          const isHovered = hoveredMetric?.name === m.name
                          
                          return (
                            <g key={m.name}>
                              <line
                                x1="150"
                                y1="150"
                                x2={outer.x}
                                y2={outer.y}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                              />
                              <text
                                x={label.x}
                                y={label.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className={`text-[10px] font-mono cursor-pointer transition-colors duration-150 ${
                                  isHovered ? 'fill-cs-blue font-bold' : 'fill-txt-dim hover:fill-txt-secondary'
                                }`}
                                onMouseEnter={() => setHoveredMetric(m)}
                                onClick={() => setHoveredMetric(m)}
                              >
                                {m.name}
                              </text>
                            </g>
                          )
                        })}
                        
                        <polygon
                          points={dataPoints}
                          fill="rgba(0,170,255,0.12)"
                          stroke="#00aaff"
                          strokeWidth="2"
                          className="transition-all duration-300"
                          style={{ filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.5))' }}
                        />
                        
                        {/* Interaction vertices */}
                        {metrics.map((m, i) => {
                          const pt = getCoords(i, m.value)
                          const isHovered = hoveredMetric?.name === m.name
                          return (
                            <circle
                              key={m.name}
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? '#00ff88' : '#00aaff'}
                              className="cursor-pointer transition-all duration-150"
                              onMouseEnter={() => setHoveredMetric(m)}
                              onClick={() => setHoveredMetric(m)}
                            />
                          )
                        })}
                      </svg>
                    </div>
                    <p className="text-[11px] text-txt-dim mt-2 font-mono">Hover points or text to view metric breakdown</p>
                  </div>

                  {/* Breakdown Detail Panel */}
                  <div className="card-v3 p-5 flex flex-col justify-between min-h-[300px]">
                    <div>
                      <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case">Metric Breakdown</h3>
                      
                      {hoveredMetric ? (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-txt-primary">{hoveredMetric.label}</span>
                            <span className="text-xl font-extrabold font-mono text-cs-blue">{hoveredMetric.value}/100</span>
                          </div>
                          
                          <p className="text-sm text-txt-secondary leading-relaxed">{hoveredMetric.desc}</p>
                          
                          {hoveredMetric.framework && (
                            <div className="border-t border-cs-border/40 pt-4 mt-2">
                              <span className="text-xs text-txt-dim block mb-1 font-display normal-case">Alignment Framework:</span>
                              {hoveredMetric.link ? (
                                <a
                                  href={hoveredMetric.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-cs-blue hover:underline font-mono inline-flex items-center gap-1"
                                >
                                  {hoveredMetric.framework} &rarr;
                                </a>
                              ) : (
                                <span className="text-xs text-txt-secondary font-mono">{hoveredMetric.framework}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                          <p className="text-sm text-txt-dim font-mono">Select or hover a radar metric to view details.</p>
                          {lowestMetric && (
                            <button
                              onClick={() => setHoveredMetric(lowestMetric)}
                              className="text-xs text-cs-blue hover:underline mt-4 font-mono"
                            >
                              Inspect Weakest Area ({lowestMetric.name}) &rarr;
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Overall Coaching Summary Box */}
                    {hoveredMetric && (
                      <div className="mt-4 p-3 bg-surface-2/30 border border-cs-border/60 rounded-cs text-xs text-txt-dim font-mono">
                        Overall grade: <span className="text-txt-primary font-bold">{gradeLabel} ({finalScore}/100)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Socratic Feedback Summary */}
                <div className="card-v3 p-6">
                  <h3 className="text-sm font-semibold text-txt-secondary mb-4 font-display normal-case">Coach Analysis</h3>
                  <p className="text-sm text-txt-primary leading-relaxed mb-6">{coachingData.summary}</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-green-signal normal-case font-display">Demonstrated Strengths</h4>
                      {coachingData.strengths?.length > 0 ? (
                        <ul className="space-y-2">
                          {coachingData.strengths.map((s, idx) => (
                            <li key={idx} className="flex gap-2 text-xs text-txt-secondary leading-relaxed">
                              <span className="text-green-signal font-mono font-bold flex-shrink-0">&radic;</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-txt-dim">None documented.</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-amber-warn normal-case font-display">Areas for Improvement</h4>
                      {coachingData.improvement_areas?.length > 0 ? (
                        <ul className="space-y-2">
                          {coachingData.improvement_areas.map((i, idx) => (
                            <li key={idx} className="flex gap-2 text-xs text-txt-secondary leading-relaxed">
                              <span className="text-amber-warn font-mono font-bold flex-shrink-0">!</span>
                              <span>{i}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-txt-dim">None documented.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-cs-border/40">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-cs-red normal-case font-display">Missed Detections / Logs</h4>
                      {coachingData.missed_detections?.length > 0 ? (
                        <ul className="space-y-2">
                          {coachingData.missed_detections.map((m, idx) => (
                            <li key={idx} className="flex gap-2 text-xs text-txt-secondary leading-relaxed">
                              <span className="text-cs-red font-mono font-bold flex-shrink-0">&times;</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-txt-dim">No major missed items.</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-cs-blue normal-case font-display">Recommended Practices</h4>
                      {coachingData.next_practice?.length > 0 ? (
                        <ul className="space-y-2">
                          {coachingData.next_practice.map((n, idx) => (
                            <li key={idx} className="flex gap-2 text-xs text-txt-secondary leading-relaxed">
                              <span className="text-cs-blue font-mono font-bold flex-shrink-0">&bull;</span>
                              <span>{n}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-txt-dim">None suggested.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Q&A Chat Console */}
                <div className="card-v3 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-cs-border/40 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-txt-secondary font-display normal-case">Socratic Operator Coach</h3>
                      <p className="text-xs text-txt-dim mt-0.5">Explore scenario context and strategies. No direct answers will be given.</p>
                    </div>
                    <Badge tone={qaRemaining > 0 ? 'blue' : 'neutral'}>
                      {qaRemaining} {qaRemaining === 1 ? 'Question' : 'Questions'} Remaining
                    </Badge>
                  </div>

                  {/* Q&A Chat Window */}
                  <div className="min-h-[150px] max-h-[300px] overflow-y-auto border border-cs-border rounded-cs p-4 bg-void/30 space-y-3 font-mono text-xs leading-relaxed">
                    {qaHistory.length === 0 ? (
                      <div className="text-txt-dim text-center py-8">
                        Ask a follow-up question below, or select a suggested topic to begin.
                      </div>
                    ) : (
                      qaHistory.map((msg, idx) => (
                        <div key={idx} className={`p-3 rounded-cs ${
                          msg.sender === 'student'
                            ? 'bg-cs-blue/10 border border-cs-blue/20 text-txt-primary ml-8'
                            : 'bg-surface-2/50 border border-cs-border text-txt-secondary mr-8'
                        }`}>
                          <span className={`font-bold block mb-1 normal-case text-[10px] font-display ${
                            msg.sender === 'student' ? 'text-cs-blue' : 'text-green-signal'
                          }`}>
                            {msg.sender === 'student' ? 'Student' : 'AI Coach'}
                          </span>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      ))
                    )}
                    {qaLoading && (
                      <div className="bg-surface-2/50 border border-cs-border p-3 rounded-cs mr-8 text-txt-dim animate-pulse">
                        <span className="font-bold block mb-1 normal-case text-[10px] text-green-signal font-display">AI Coach</span>
                        Analyzing context and drafting Socratic guidance...
                      </div>
                    )}
                  </div>

                  {/* Pre-populated Suggestions */}
                  {qaRemaining > 0 && !qaLoading && (
                    <div className="space-y-2">
                      <span className="text-xs text-txt-dim font-mono block">Suggested Questions (tailored to lowest metric: {lowestMetric?.name}):</span>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => submitQuestion(s)}
                            className="text-left text-xs bg-surface-2/40 border border-cs-border/60 hover:bg-surface-2/80 hover:border-cs-blue/50 text-txt-secondary hover:text-txt-primary transition-all px-3 py-1.5 rounded-cs font-mono"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
                      placeholder={qaRemaining > 0 ? "Ask the coach about a technique, signature, or phase..." : "No questions remaining"}
                      disabled={qaRemaining <= 0 || qaLoading}
                      className="flex-1 bg-void/60 border border-cs-border focus:border-cs-blue focus:outline-none rounded-cs px-4 py-2 text-sm text-txt-primary placeholder-txt-dim font-mono disabled:opacity-50"
                    />
                    <Button
                      onClick={() => submitQuestion()}
                      disabled={!questionInput.trim() || qaRemaining <= 0 || qaLoading}
                      variant="blue"
                      size="sm"
                    >
                      Ask
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            session={session}
            score={finalScore}
            gradeLabel={gradeLabel}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function DebriefLoading() {
  return (
    <div className="min-h-dvh bg-void flex items-center justify-center">
      <style>{`
        @keyframes debriefLogoPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.92); } }
      `}</style>
      <div className="flex flex-col items-center gap-4">
        <img src="/brand/parallax-icon.svg" alt="" aria-hidden="true" className="w-12 h-12" style={{ animation: 'debriefLogoPulse 1.4s ease-in-out infinite' }} />
        <span className="text-sm text-txt-secondary font-mono">Loading debrief...</span>
      </div>
    </div>
  )
}

function useCountUp(target, duration = 1000) {
  const reduced = useReducedMotionSafe()
  const clamped = Math.max(0, Math.min(100, Number(target) || 0))
  const [display, setDisplay] = useState(reduced ? clamped : 0)

  useEffect(() => {
    if (reduced) { setDisplay(clamped); return }
    const steps = clamped
    if (steps === 0) return
    const interval = duration / steps
    let step = 0
    const id = setInterval(() => {
      step++
      setDisplay(Math.round((clamped * step) / steps))
      if (step >= steps) clearInterval(id)
    }, interval)
    return () => clearInterval(id)
  }, [target, duration, reduced, clamped])
  return display
}

function ScoreRing({ score, gradeColor, gradeLabel }) {
  const reduced = useReducedMotionSafe()
  // Under reduced-motion start ready immediately so no transition plays
  const [ready, setReady] = useState(reduced)
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, Number(score) || 0))
  const offset = ready ? circumference - (clamped / 100) * circumference : circumference
  const stroke = clamped >= 80 ? '#00ff88' : clamped >= 60 ? '#ffaa00' : '#ff3b3b'
  const displayScore = useCountUp(ready ? clamped : 0, 1200)

  useEffect(() => {
    if (reduced) return
    const timer = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(timer)
  }, [score, reduced])

  return (
    <div className="flex-shrink-0 text-center">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90"
          role="img" aria-label={`Score ring: ${clamped} out of 100`}>
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
            style={{
              transition: reduced ? 'none' : 'stroke-dashoffset 1.2s ease-out',
              filter: `drop-shadow(0 0 5px ${stroke}a0)`
            }}
          />
        </svg>
        <div className="absolute inset-3 rounded-full bg-[#030508]/80 border border-cs-border backdrop-blur-md flex items-center justify-center">
          <div>
            <div className={`text-4xl font-extrabold font-mono tabular-nums ${gradeColor}`}>{displayScore}</div>
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
            <h3 className="text-sm font-semibold text-txt-secondary font-display normal-case">Cause And Effect</h3>
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
        <h3 className={`text-xs font-semibold normal-case font-display ${palette}`}>{title}</h3>
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
      <h3 className="text-sm font-semibold text-txt-secondary mb-3 font-display normal-case">{title}</h3>
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
