/**
 * Phase 17 — Kill Chain Timeline
 *
 * SVG-based dual-axis timeline showing:
 *   - Top row: Red Team commands (attack events) with tool labels
 *   - Bottom row: Blue Team SIEM events (detection events)
 *
 * Events are aligned on a shared time axis derived from the combined
 * command_log + siem_events timestamp range.
 */

import { useEffect, useState } from 'react'
import api from '../../lib/api'

const RED_TRACK_Y = 40
const BLUE_TRACK_Y = 120
const TRACK_HEIGHT = 20
const TOTAL_HEIGHT = 180
const MARGIN_LEFT = 80
const MARGIN_RIGHT = 20

const MITRE_COLOR = {
  'T1590': '#a855f7', 'T1595': '#a855f7',
  'T1190': '#ef4444', 'T1552': '#ef4444',
  'T1005': '#f97316', 'T1558': '#eab308',
  'T1059': '#ef4444', 'T1078': '#f97316',
}

function toTimestamp(iso) {
  return new Date(iso).getTime()
}

function scaleX(ts, minTs, maxTs, width) {
  if (maxTs === minTs) return MARGIN_LEFT + width / 2
  return MARGIN_LEFT + ((ts - minTs) / (maxTs - minTs)) * width
}

export default function KillChainTimeline({ sessionId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    api.get(`/reports/${sessionId}/timeline`)
      .then(r => { setData(r.data); setError(null) })
      .catch(e => setError(e.response?.data?.detail || 'Timeline unavailable'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <div className="text-gray-600 text-xs py-4 text-center">Loading timeline...</div>
  if (error) return <div className="text-gray-700 text-xs py-4 text-center">{error}</div>
  if (!data || (data.commands.length === 0 && data.siem_events.length === 0)) {
    return <div className="text-gray-700 text-xs py-4 text-center">No events recorded for this session yet.</div>
  }

  const allTs = [
    ...data.commands.map(c => toTimestamp(c.created_at)),
    ...data.siem_events.map(e => toTimestamp(e.created_at)),
  ]
  const minTs = Math.min(...allTs)
  const maxTs = Math.max(...allTs)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Kill Chain Timeline
        <span className="text-gray-600 font-normal text-xs ml-auto">
          {new Date(minTs).toLocaleTimeString()} → {new Date(maxTs).toLocaleTimeString()}
        </span>
      </h2>
      <div className="overflow-x-auto">
        <TimelineSvg
          commands={data.commands}
          siemEvents={data.siem_events}
          minTs={minTs}
          maxTs={maxTs}
        />
      </div>
      <div className="flex gap-6 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><span className="w-3 h-px bg-red-500 inline-block" /><span>Red: Attacker commands</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-px bg-teal-500 inline-block" /><span>Blue: SIEM detections</span></div>
      </div>
    </div>
  )
}

function TimelineSvg({ commands, siemEvents, minTs, maxTs }) {
  // Dynamically size SVG to container
  const SVG_WIDTH = Math.max(600, commands.length * 60 + siemEvents.length * 40)
  const drawWidth = SVG_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${TOTAL_HEIGHT}`}
      width={SVG_WIDTH}
      height={TOTAL_HEIGHT}
      className="overflow-visible"
    >
      {/* Track labels */}
      <text x={MARGIN_LEFT - 8} y={RED_TRACK_Y + TRACK_HEIGHT / 2 + 4} textAnchor="end" className="fill-red-400" fontSize="10" fontFamily="monospace">RED</text>
      <text x={MARGIN_LEFT - 8} y={BLUE_TRACK_Y + TRACK_HEIGHT / 2 + 4} textAnchor="end" className="fill-teal-400" fontSize="10" fontFamily="monospace">BLUE</text>

      {/* Track baselines */}
      <line x1={MARGIN_LEFT} y1={RED_TRACK_Y + TRACK_HEIGHT / 2} x2={SVG_WIDTH - MARGIN_RIGHT} y2={RED_TRACK_Y + TRACK_HEIGHT / 2} stroke="#374151" strokeWidth="1" />
      <line x1={MARGIN_LEFT} y1={BLUE_TRACK_Y + TRACK_HEIGHT / 2} x2={SVG_WIDTH - MARGIN_RIGHT} y2={BLUE_TRACK_Y + TRACK_HEIGHT / 2} stroke="#374151" strokeWidth="1" />

      {/* Red Team: commands */}
      {commands.map((cmd, i) => {
        const x = scaleX(toTimestamp(cmd.created_at), minTs, maxTs, drawWidth)
        const tool = cmd.tool || cmd.command?.split(' ')[0] || '?'
        return (
          <g key={`cmd-${i}`}>
            <circle cx={x} cy={RED_TRACK_Y + TRACK_HEIGHT / 2} r={5} fill="#ef4444" fillOpacity={0.85} />
            <text x={x} y={RED_TRACK_Y - 6} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#f87171" className="select-none">{tool.slice(0, 10)}</text>
            <title>{cmd.command}</title>
          </g>
        )
      })}

      {/* Blue Team: SIEM events */}
      {siemEvents.map((ev, i) => {
        const x = scaleX(toTimestamp(ev.created_at), minTs, maxTs, drawWidth)
        const sevColor = { CRITICAL: '#ef4444', HIGH: '#f97316', MED: '#eab308', MEDIUM: '#eab308', LOW: '#3b82f6', INFO: '#6b7280' }
        const color = sevColor[(ev.severity || '').toUpperCase()] || '#6b7280'
        const mitreTick = ev.mitre_technique && MITRE_COLOR[ev.mitre_technique]
        return (
          <g key={`ev-${i}`}>
            <circle cx={x} cy={BLUE_TRACK_Y + TRACK_HEIGHT / 2} r={5} fill={color} fillOpacity={0.85} />
            {mitreTick && <circle cx={x} cy={BLUE_TRACK_Y + TRACK_HEIGHT / 2} r={8} fill="none" stroke={mitreTick} strokeWidth="1" strokeDasharray="2" />}
            <text x={x} y={BLUE_TRACK_Y + TRACK_HEIGHT + 14} textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#6b7280" className="select-none">
              {(ev.severity || '').slice(0, 4)}
            </text>
            <title>{ev.message}</title>
          </g>
        )
      })}

      {/* Connector lines between causally-linked events (if triggered_by_command_id) */}
      {siemEvents.filter(ev => ev.triggered_by_command).map((ev, i) => {
        const cmd = commands.find(c => c.id === ev.triggered_by_command)
        if (!cmd) return null
        const x1 = scaleX(toTimestamp(cmd.created_at), minTs, maxTs, drawWidth)
        const x2 = scaleX(toTimestamp(ev.created_at), minTs, maxTs, drawWidth)
        const y1 = RED_TRACK_Y + TRACK_HEIGHT / 2
        const y2 = BLUE_TRACK_Y + TRACK_HEIGHT / 2
        return (
          <line key={`link-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374151" strokeWidth="1" strokeDasharray="3,2" />
        )
      })}
    </svg>
  )
}
