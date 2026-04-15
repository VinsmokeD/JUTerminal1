import { useMemo, useState } from 'react'

/**
 * KillChainTimeline — Dual-axis SVG attack timeline
 *
 * Top rail  (red):  attacker commands, plotted by timestamp
 * Bottom rail (blue): SIEM detections, plotted by timestamp
 * Connector lines show cause-and-effect latency between attack and detection.
 *
 * No D3 — pure SVG with calculated x positions from timestamp ranges.
 */

const RAIL_Y_RED   = 60   // y-center of red rail
const RAIL_Y_BLUE  = 160  // y-center of blue rail
const AXIS_Y       = 110  // y of the shared time axis
const PADDING_X    = 70   // left/right padding
const DOT_R        = 6    // event dot radius
const CARD_W       = 130  // max event card width
const SVG_H        = 240  // total SVG height

// Severity → color
const sevColor = (sev) => {
  switch ((sev || '').toUpperCase()) {
    case 'CRITICAL': return '#ef4444'
    case 'HIGH':     return '#f97316'
    case 'MEDIUM':
    case 'MED':      return '#eab308'
    case 'LOW':      return '#3b82f6'
    default:         return '#64748b'
  }
}

export default function KillChainTimeline({ commands = [], siemEvents = [] }) {
  const [hovered, setHovered] = useState(null) // { type: 'cmd'|'evt', index }

  // ── Combine and sort all events by timestamp ──────────────────────────────
  const { redItems, blueItems, minTs, maxTs } = useMemo(() => {
    const toMs = (v) => v ? new Date(v).getTime() : 0

    const red = commands
      .filter((c) => c.created_at || c.timestamp)
      .map((c, i) => ({ ...c, ms: toMs(c.created_at || c.timestamp), index: i }))
      .sort((a, b) => a.ms - b.ms)

    const blue = siemEvents
      .filter((e) => !e.noise && (e.created_at || e.timestamp))
      .map((e, i) => ({ ...e, ms: toMs(e.created_at || e.timestamp), index: i }))
      .sort((a, b) => a.ms - b.ms)

    const all = [...red.map((r) => r.ms), ...blue.map((b) => b.ms)].filter(Boolean)
    const min = all.length ? Math.min(...all) : Date.now() - 60000
    const max = all.length ? Math.max(...all) : Date.now()

    return { redItems: red, blueItems: blue, minTs: min, maxTs: max }
  }, [commands, siemEvents])

  const isEmpty = redItems.length === 0 && blueItems.length === 0

  // ── x position from timestamp ─────────────────────────────────────────────
  const xPos = (ms, width) => {
    const range = maxTs - minTs || 1
    return PADDING_X + ((ms - minTs) / range) * (width - PADDING_X * 2)
  }

  // ── Detection gap annotations ──────────────────────────────────────────────
  const gaps = useMemo(() => {
    const result = []
    redItems.forEach((cmd) => {
      const firstDetection = blueItems.find((ev) => ev.ms >= cmd.ms)
      if (firstDetection) {
        const gapMs = firstDetection.ms - cmd.ms
        result.push({ cmdMs: cmd.ms, evMs: firstDetection.ms, gapMs, label: formatGap(gapMs) })
      }
    })
    return result
  }, [redItems, blueItems])

  if (isEmpty) return <EmptyTimeline />

  return (
    <div className="w-full">
      {/* ── Legend ────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          Red Team — Commands
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full bg-teal-500" />
          Blue Team — Detections
        </div>
        {gaps.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-4 h-px bg-slate-600 inline-block" />
            Detection latency
          </div>
        )}
        <div className="ml-auto text-xs text-slate-600 font-mono-terminal">
          {redItems.length} commands · {blueItems.length} detections
        </div>
      </div>

      {/* ── SVG Timeline ─────────────────────────────────────── */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-900/60">
        <svg
          width="100%"
          height={SVG_H}
          viewBox={`0 0 800 ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          style={{ minWidth: Math.max(600, redItems.length * 80, blueItems.length * 80) }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,116,139,0.06)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Rail labels */}
          <text x="8" y={RAIL_Y_RED + 4} fill="#f87171" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
            ATTACK
          </text>
          <text x="8" y={RAIL_Y_BLUE + 4} fill="#2dd4bf" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
            DETECT
          </text>

          {/* Center time axis */}
          <line x1={PADDING_X} y1={AXIS_Y} x2="730" y2={AXIS_Y} stroke="#334155" strokeWidth="1" strokeDasharray="4 4"/>

          {/* Rail backgrounds */}
          <rect x={PADDING_X} y={RAIL_Y_RED - 24} width="660" height="48" rx="8"
            fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.08)" strokeWidth="1"/>
          <rect x={PADDING_X} y={RAIL_Y_BLUE - 24} width="660" height="48" rx="8"
            fill="rgba(20,184,166,0.04)" stroke="rgba(20,184,166,0.08)" strokeWidth="1"/>

          {/* ── Detection gap connector lines ────────────────── */}
          {gaps.map((g, i) => {
            const x1 = xPos(g.cmdMs, 800)
            const x2 = xPos(g.evMs, 800)
            const midX = (x1 + x2) / 2
            return (
              <g key={i}>
                <line x1={x1} y1={RAIL_Y_RED + DOT_R} x2={x2} y2={RAIL_Y_BLUE - DOT_R}
                  stroke="#475569" strokeWidth="1" strokeDasharray="3 3"/>
                {/* Gap label */}
                <text x={midX} y={AXIS_Y - 4} textAnchor="middle"
                  fill="#64748b" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  +{g.label}
                </text>
              </g>
            )
          })}

          {/* ── Red team command events ────────────────────── */}
          {redItems.map((cmd, i) => {
            const x = xPos(cmd.ms, 800)
            const isHovered = hovered?.type === 'cmd' && hovered?.index === i
            const label = (cmd.command || cmd.tool || 'cmd').slice(0, 16)
            return (
              <g key={i}
                onMouseEnter={() => setHovered({ type: 'cmd', index: i })}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Dot */}
                <circle cx={x} cy={RAIL_Y_RED} r={isHovered ? DOT_R + 2 : DOT_R}
                  fill="#ef4444" stroke="#fca5a5" strokeWidth={isHovered ? 2 : 1}
                  style={{ transition: 'r 0.15s, stroke-width 0.15s' }}/>
                {/* Tick to axis */}
                <line x1={x} y1={RAIL_Y_RED + DOT_R} x2={x} y2={AXIS_Y}
                  stroke="rgba(239,68,68,0.3)" strokeWidth="1"/>
                {/* Label (above dot) */}
                <text x={x} y={RAIL_Y_RED - DOT_R - 6} textAnchor="middle"
                  fill="#fca5a5" fontSize="9" fontFamily="JetBrains Mono, monospace"
                  className="select-none">
                  {label}
                </text>
                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect x={x - 60} y={4} width={120} height={32} rx="4"
                      fill="#1e293b" stroke="#ef4444" strokeWidth="0.5"/>
                    <text x={x} y={16} textAnchor="middle"
                      fill="#f87171" fontSize="9" fontFamily="JetBrains Mono, monospace">
                      {(cmd.command || 'command').slice(0, 24)}
                    </text>
                    <text x={x} y={28} textAnchor="middle"
                      fill="#64748b" fontSize="8" fontFamily="JetBrains Mono, monospace">
                      {new Date(cmd.ms).toLocaleTimeString()}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* ── Blue team detection events ─────────────────── */}
          {blueItems.map((ev, i) => {
            const x = xPos(ev.ms, 800)
            const isHovered = hovered?.type === 'evt' && hovered?.index === i
            const color = sevColor(ev.severity)
            const label = (ev.mitre_technique || ev.source || 'alert').slice(0, 12)
            return (
              <g key={i}
                onMouseEnter={() => setHovered({ type: 'evt', index: i })}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Tick from axis */}
                <line x1={x} y1={AXIS_Y} x2={x} y2={RAIL_Y_BLUE - DOT_R}
                  stroke={`${color}44`} strokeWidth="1"/>
                {/* Dot */}
                <circle cx={x} cy={RAIL_Y_BLUE} r={isHovered ? DOT_R + 2 : DOT_R}
                  fill={color} stroke={color} strokeWidth={isHovered ? 2 : 0.5}
                  style={{ transition: 'r 0.15s' }}/>
                {/* Label (below dot) */}
                <text x={x} y={RAIL_Y_BLUE + DOT_R + 12} textAnchor="middle"
                  fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono, monospace"
                  className="select-none">
                  {label}
                </text>
                {/* Severity badge rectangle */}
                <rect x={x - 15} y={RAIL_Y_BLUE + DOT_R + 15} width={30} height={10} rx="2"
                  fill={`${color}22`} stroke={`${color}55`} strokeWidth="0.5"/>
                <text x={x} y={RAIL_Y_BLUE + DOT_R + 23} textAnchor="middle"
                  fill={color} fontSize="7" fontFamily="JetBrains Mono, monospace">
                  {(ev.severity || 'LOW').slice(0, 4)}
                </text>
                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect x={x - 70} y={SVG_H - 50} width={140} height={40} rx="4"
                      fill="#1e293b" stroke={color} strokeWidth="0.5"/>
                    <text x={x} y={SVG_H - 35} textAnchor="middle"
                      fill="#e2e8f0" fontSize="9" fontFamily="JetBrains Mono, monospace">
                      {(ev.message || '').slice(0, 28)}
                    </text>
                    <text x={x} y={SVG_H - 22} textAnchor="middle"
                      fill="#64748b" fontSize="8" fontFamily="JetBrains Mono, monospace">
                      {new Date(ev.ms).toLocaleTimeString()}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── Summary stats ────────────────────────────────────── */}
      {gaps.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatCard
            label="Avg detection gap"
            value={formatGap(gaps.reduce((s, g) => s + g.gapMs, 0) / gaps.length)}
            sub="attack → first alert"
            color="text-yellow-400"
          />
          <StatCard
            label="Fastest detection"
            value={formatGap(Math.min(...gaps.map((g) => g.gapMs)))}
            sub="best case latency"
            color="text-emerald-400"
          />
          <StatCard
            label="Slowest detection"
            value={formatGap(Math.max(...gaps.map((g) => g.gapMs)))}
            sub="worst case latency"
            color="text-rose-400"
          />
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold font-mono-terminal ${color}`}>{value}</div>
      <div className="text-slate-400 text-xs mt-1 font-medium">{label}</div>
      <div className="text-slate-600 text-xs mt-0.5">{sub}</div>
    </div>
  )
}

function EmptyTimeline() {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
        </svg>
      </div>
      <p className="text-slate-500 text-sm">No timeline data yet</p>
      <p className="text-slate-700 text-xs mt-1">Complete the scenario to see the attack-detection timeline</p>
    </div>
  )
}

function formatGap(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}
