import { useEffect, useState, useMemo, useRef } from 'react'
import api from '../../lib/api'
import { Badge } from '../ui'

const LANE_HEIGHT = 120
const PADDING_X = 50
const SEV_COLORS = { CRITICAL: '#ff3b3b', HIGH: '#ffaa00', MEDIUM: '#ffaa00', MED: '#ffaa00', LOW: '#3b8bff', INFO: '#8ca1c2' }

export default function KillChainView({ sessionId, role: _role }) {
  const [data, setData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    api.get(`/sessions/${sessionId}/killchain`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sessionId])

  const { timeline, matches, durationMs, minTime } = useMemo(() => {
    if (!data) return { timeline: [], matches: [], durationMs: 0, minTime: 0 }
    
    const toMs = (v) => new Date(v).getTime()
    const red = data.commands.map(c => ({ ...c, kind: 'command', ms: toMs(c.created_at) }))
    const blueEvents = data.siem_events.filter(e => e.source !== 'background').map(e => ({ ...e, kind: 'event', ms: toMs(e.created_at) }))
    const blueActions = (data.containment_actions || []).map(a => ({ ...a, kind: 'action', ms: toMs(a.created_at) }))
    const blue = [...blueEvents, ...blueActions]
    const all = [...red, ...blue]
    if (all.length === 0) return { timeline: [], matches: [], durationMs: 1, minTime: Date.now() }
    
    const minTime = Math.min(...all.map(x => x.ms))
    const maxTime = Math.max(...all.map(x => x.ms))
    const durationMs = maxTime - minTime || 1000

    const matches = []
    data.cause_effect?.forEach(ce => {
      const cmd = red.find(r => r.id === ce.command_id)
      if (cmd && ce.related_events) {
        ce.related_events.forEach(re => {
          const ev = blueEvents.find(b => b.id === re.id)
          if (ev) matches.push({ source: cmd, target: ev })
        })
      }
    })

    return { timeline: all, matches, durationMs, minTime }
  }, [data])

  if (loading) return <div className="h-[300px] flex items-center justify-center text-txt-dim font-mono text-sm animate-pulse">Loading Kill Chain...</div>
  if (!data || timeline.length === 0) return (
    <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-cs-border rounded-cs-lg text-txt-dim font-mono text-sm">
      No events recorded yet. Start executing commands to build the chain.
    </div>
  )

  const width = Math.max(800, durationMs / 1000 * 20)
  const containerHeight = LANE_HEIGHT * 2 + 60

  const getX = (ms) => PADDING_X + ((ms - minTime) / durationMs) * (width - PADDING_X * 2)
  const getY = (kind) => kind === 'command' ? 60 : LANE_HEIGHT + 60

  const getNodeColor = (item) => {
    if (item.kind === 'command') return '#ff3b3b'
    if (item.kind === 'action') return '#00ff88' // Green for containment
    return SEV_COLORS[item.severity?.toUpperCase() || 'LOW'] || '#3b8bff'
  }

  const getNodeRadius = (item) => {
    if (item.kind === 'command') return 8
    if (item.kind === 'action') return 10
    const sev = item.severity?.toUpperCase() || 'LOW'
    return sev === 'CRITICAL' ? 12 : sev === 'HIGH' ? 10 : 8
  }

  return (
    <div className="relative w-full overflow-hidden bg-surface-1/40 rounded-cs-lg border border-cs-border">
      <div className="overflow-x-auto overflow-y-hidden" ref={containerRef}>
        <svg width={width} height={containerHeight} className="min-w-full">
          {/* Lanes */}
          <rect x={0} y={0} width={width} height={LANE_HEIGHT} fill="rgba(255,59,59,0.02)" />
          <rect x={0} y={LANE_HEIGHT} width={width} height={LANE_HEIGHT} fill="rgba(59,139,255,0.02)" />
          <line x1={0} y1={LANE_HEIGHT} x2={width} y2={LANE_HEIGHT} stroke="rgba(255,255,255,0.05)" strokeWidth={2} strokeDasharray="4 4" />
          
          <text x={10} y={30} className="text-xs font-mono font-bold" fill="#ff3b3b" opacity={0.5}>RED TEAM (Attacker)</text>
          <text x={10} y={LANE_HEIGHT + 30} className="text-xs font-mono font-bold" fill="#3b8bff" opacity={0.5}>BLUE TEAM (Defenses & Response)</text>

          {/* Arcs (Attack -> Detection) */}
          {matches.map((m, i) => {
            const x1 = getX(m.source.ms)
            const y1 = getY('command')
            const x2 = getX(m.target.ms)
            const y2 = getY('event')
            const isSelected = selectedNode && (selectedNode.id === m.source.id || selectedNode.id === m.target.id)
            const path = `M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`
            return (
              <path 
                key={`arc-${i}`} 
                d={path} 
                fill="none" 
                stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.15)'} 
                strokeWidth={isSelected ? 2 : 1} 
              />
            )
          })}

          {/* Nodes */}
          {timeline.map((item) => {
            const x = getX(item.ms)
            const y = getY(item.kind === 'command' ? 'command' : 'event')
            const r = getNodeRadius(item)
            const color = getNodeColor(item)
            const isSelected = selectedNode?.id === item.id
            const hasAiHint = item.kind === 'command' && data.ai_interactions?.some(ai => ai.command_context === item.command && ai.kind === 'hint_request')
            
            return (
              <g key={item.id} className="cursor-pointer" onClick={() => setSelectedNode(item)}>
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 6} fill="none" stroke={color} strokeWidth={2} className="animate-pulse" />
                )}
                
                {/* Containment actions are shields/hexagons */}
                {item.kind === 'action' ? (
                  <rect x={x-r} y={y-r} width={r*2} height={r*2} rx="2" fill={color} transform={`rotate(45 ${x} ${y})`} className="transition-transform hover:scale-125" />
                ) : (
                  <circle cx={x} cy={y} r={r} fill={color} className="transition-transform hover:scale-125" />
                )}
                
                {hasAiHint && (
                  <circle cx={x+r} cy={y-r} r={4} fill="#ffaa00" />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Overlay Details */}
      {selectedNode && (
        <div className="absolute right-4 top-4 w-80 bg-surface-2 border border-cs-border rounded-cs-lg p-5 shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-start mb-3">
            <Badge tone={selectedNode.kind === 'command' ? 'red' : selectedNode.kind === 'action' ? 'green' : 'blue'}>
              {selectedNode.kind === 'command' ? 'OFFENSIVE ACTION' : selectedNode.kind === 'action' ? 'BLUE RESPONSE' : 'SECURITY ALERT'}
            </Badge>
            <button onClick={() => setSelectedNode(null)} className="text-txt-dim hover:text-txt-primary">✕</button>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">Time</div>
              <div className="text-xs font-mono">{new Date(selectedNode.ms).toLocaleTimeString()}</div>
            </div>
            
            <div>
              <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">
                {selectedNode.kind === 'command' ? 'Action' : selectedNode.kind === 'action' ? 'Containment' : 'Alert Message'}
              </div>
              <div className={`text-xs font-mono bg-void/50 p-2 rounded-cs-sm break-all ${
                selectedNode.kind === 'command' ? 'text-cs-red' : 
                selectedNode.kind === 'action' ? 'text-green-signal' : 
                'text-cs-blue'
              }`}>
                {selectedNode.command || selectedNode.action_type || selectedNode.message}
                {selectedNode.kind === 'action' && <span className="block mt-1 text-[10px] text-txt-dim">Target: {selectedNode.target_value}</span>}
              </div>
            </div>

            {selectedNode.kind === 'event' && selectedNode.mitre_technique && (
              <div>
                <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">MITRE Technique</div>
                <div className="text-xs font-mono">{selectedNode.mitre_technique}</div>
              </div>
            )}

            {/* AI Hints */}
            {selectedNode.kind === 'command' && (
              <div className="pt-3 border-t border-cs-border/40">
                <div className="text-[10px] font-mono text-amber-warn uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-warn" />
                  AI Guidance Received
                </div>
                {data.ai_interactions?.filter(ai => ai.command_context === selectedNode.command).map((ai, idx) => (
                  <div key={idx} className="bg-amber-warn/5 border border-amber-warn/20 p-2 rounded-cs-sm text-xs font-mono text-txt-secondary mb-2 max-h-32 overflow-y-auto">
                    <span className="text-amber-warn font-bold mb-1 block">Level {ai.hint_level}</span>
                    {ai.response_text}
                  </div>
                ))}
              </div>
            )}
            
            {/* Links */}
            <div className="pt-3 border-t border-cs-border/40">
              <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-2">
                {selectedNode.kind === 'command' ? 'Triggered Detections' : 'Causing Action'}
              </div>
              <div className="space-y-1">
                {matches.filter(m => selectedNode.kind === 'command' ? m.source.id === selectedNode.id : m.target.id === selectedNode.id).map((m, idx) => {
                  const linkTarget = selectedNode.kind === 'command' ? m.target : m.source
                  return (
                    <button 
                      key={idx}
                      onClick={() => setSelectedNode(linkTarget)}
                      className="w-full text-left p-1.5 bg-surface-3 hover:bg-surface-4 rounded-cs-sm text-[10px] font-mono truncate transition-colors"
                    >
                      → {linkTarget.command || linkTarget.message}
                    </button>
                  )
                })}
                {matches.filter(m => selectedNode.kind === 'command' ? m.source.id === selectedNode.id : m.target.id === selectedNode.id).length === 0 && (
                  <div className="text-[10px] text-txt-dim font-mono italic">No correlation metadata.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
