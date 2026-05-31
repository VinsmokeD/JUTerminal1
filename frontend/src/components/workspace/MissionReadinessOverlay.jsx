import { useState, useEffect } from 'react'
import api from '../../lib/api'

export default function MissionReadinessOverlay({ sessionId, scenarioId, onClose }) {
  const [readiness, setReadiness] = useState({
    status: 'initializing',
    checks: {
      kali: { status: 'initializing', detail: 'Locating console proxy...' },
      targets: { status: 'initializing', containers: {} },
      redis: { status: 'initializing', detail: 'Testing cache...' },
      elasticsearch: { status: 'initializing', detail: 'Probing SIEM...' },
      openrouter: { status: 'initializing', detail: 'Resolving AI context...' }
    }
  })
  const [elapsed, setElapsed] = useState(0)
  const [selectedNode, setSelectedNode] = useState(null)
  const [visible, setVisible] = useState(true)

  // Track elapsed time to show "Override & Launch" button
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Listen to WebSocket readiness updates
  useEffect(() => {
    const handleReadinessUpdate = (e) => {
      const msg = e.detail
      if (msg.session_id === sessionId) {
        setReadiness(msg)
        if (msg.status === 'ready') {
          // Fade out and close
          setTimeout(() => {
            setVisible(false)
            if (onClose) onClose()
          }, 1500)
        }
      }
    }
    window.addEventListener('readiness:update', handleReadinessUpdate)
    return () => window.removeEventListener('readiness:update', handleReadinessUpdate)
  }, [sessionId, onClose])

  const handleOverride = async () => {
    try {
      await api.post(`/sessions/${sessionId}/override`)
      setReadiness((prev) => ({ ...prev, status: 'ready' }))
      setTimeout(() => {
        setVisible(false)
        if (onClose) onClose()
      }, 500)
    } catch (err) {
      console.error('Failed to override readiness checks:', err)
    }
  }

  if (!visible) return null

  // Determine node data based on Scenario
  const getTopologyNodes = () => {
    const sc = (scenarioId || '').toLowerCase().replace('-', '')
    const checks = readiness.checks || {}
    
    // Status colors helper
    const getStatusColor = (status) => {
      if (status === 'ok') return '#10B981' // Green
      if (status === 'error') return '#EF4444' // Red
      return '#F59E0B' // Orange / Initializing
    }

    const kaliStatus = checks.kali?.status || 'initializing'
    const siemStatus = checks.elasticsearch?.status || 'initializing'
    
    const nodes = [
      {
        id: 'kali',
        label: 'Kali Console',
        ip: '172.20.X.X (DHCP)',
        os: 'Kali GNU/Linux',
        status: kaliStatus,
        color: getStatusColor(kaliStatus),
        ports: 'SSH (22), VNC (5901)',
        desc: 'Student offensive sandbox environment containing security tools and utilities.',
        x: 100,
        y: 200
      },
      {
        id: 'siem',
        label: 'Elastic SIEM',
        ip: '172.20.X.2 (Local Host)',
        os: 'Elasticsearch & Filebeat Stack',
        status: siemStatus,
        color: getStatusColor(siemStatus),
        ports: 'HTTP (9200), PubSub (6379)',
        desc: 'Central security monitoring system processing log telemetry in real-time.',
        x: 400,
        y: 320
      }
    ]

    const targetContainers = checks.targets?.containers || {}

    if (sc === 'sc01') {
      const waf = targetContainers['sc01-waf']?.status || 'initializing'
      const web = targetContainers['sc01-webapp']?.status || 'initializing'
      const db = targetContainers['sc01-db']?.status || 'initializing'

      nodes.push(
        {
          id: 'waf',
          label: 'ModSecurity WAF',
          ip: '172.20.1.1',
          os: 'Nginx + WAF rules',
          status: waf,
          color: getStatusColor(waf),
          ports: 'HTTP (80), HTTPS (443)',
          desc: 'ModSecurity Web Application Firewall filtering malicious requests before they hit the web node.',
          x: 280,
          y: 100
        },
        {
          id: 'webapp',
          label: 'NovaMed Portal',
          ip: '172.20.1.20',
          os: 'Apache + PHP 8.1',
          status: web,
          color: getStatusColor(web),
          ports: 'HTTP (80)',
          desc: 'Primary patient management system exposing web API routes and clinical portals.',
          x: 460,
          y: 100
        },
        {
          id: 'db',
          label: 'MySQL database',
          ip: '172.20.1.21',
          os: 'MariaDB 10.6',
          status: db,
          color: getStatusColor(db),
          ports: 'MySQL (3306)',
          desc: 'Core patient record database containing clinical tables, passwords, and records.',
          x: 600,
          y: 200
        }
      )
    } else if (sc === 'sc02') {
      const dc = targetContainers['sc02-dc']?.status || 'initializing'
      const fs = targetContainers['sc02-fileserver']?.status || 'initializing'

      nodes.push(
        {
          id: 'dc',
          label: 'Active Directory DC',
          ip: '172.20.2.20',
          os: 'Samba4 AD Domain Controller',
          status: dc,
          color: getStatusColor(dc),
          ports: 'Kerberos (88), LDAP (389), SMB (445)',
          desc: 'Primary domain controller managing nexora.local directory services, policies, and keys.',
          x: 320,
          y: 100
        },
        {
          id: 'fileserver',
          label: 'Finance Share Server',
          ip: '172.20.2.40',
          os: 'Windows Server / SMB Agent',
          status: fs,
          color: getStatusColor(fs),
          ports: 'SMB (445)',
          desc: 'File server holding the corporate public network share and finance records.',
          x: 550,
          y: 150
        }
      )
    } else {
      // Default to sc03 or placeholder
      const mail = targetContainers['sc03-mailrelay']?.status || 'initializing'
      const phish = targetContainers['sc03-phish']?.status || 'initializing'
      const vic = targetContainers['sc03-victim']?.status || 'initializing'

      nodes.push(
        {
          id: 'mailrelay',
          label: 'SMTP Relay',
          ip: '172.20.3.20',
          os: 'Postfix Mail Gateway',
          status: mail,
          color: getStatusColor(mail),
          ports: 'SMTP (25)',
          desc: 'Secure email relay processing inbound and outbound logistics department emails.',
          x: 300,
          y: 100
        },
        {
          id: 'phish',
          label: 'Phishing server',
          ip: '172.20.3.40',
          os: 'GoPhish engine',
          status: phish,
          color: getStatusColor(phish),
          ports: 'Admin (3333)',
          desc: 'Offensive campaign scheduler managing templates, users, and tracking landing pages.',
          x: 480,
          y: 100
        },
        {
          id: 'victim',
          label: 'Orion Victim PC',
          ip: '172.20.3.30',
          os: 'Windows Desktop Sim',
          status: vic,
          color: getStatusColor(vic),
          ports: 'HTTP (8080)',
          desc: 'Simulated employee workstation processing incoming logistics emails and attachments.',
          x: 600,
          y: 200
        }
      )
    }

    return nodes
  }

  const nodes = getTopologyNodes()

  return (
    <div className="absolute inset-0 z-50 flex flex-col md:flex-row bg-[#0D0F12]/95 backdrop-blur-md p-6 font-mono text-gray-300 select-none overflow-auto transition-opacity duration-1000 ease-out">
      {/* Sidebar: Retro Boot Logs */}
      <div className="w-full md:w-[350px] flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-800 pb-6 md:pb-0 md:pr-6">
        <div>
          <div className="text-[#38bdf8] text-lg font-bold border-b border-gray-800 pb-2 mb-4 tracking-wider flex items-center">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping mr-2"></span>
            MISSION READINESS REPORT
          </div>
          
          <div className="space-y-3 text-xs leading-relaxed max-h-[300px] md:max-h-[500px] overflow-y-auto">
            <div>
              <span className="text-[#38bdf8]">[~]</span> Initializing Parallax local sandbox...
            </div>
            
            {/* Kali check */}
            <div className="transition-all duration-300">
              <span className={readiness.checks.kali?.status === 'ok' ? 'text-green-400' : 'text-yellow-500'}>
                {readiness.checks.kali?.status === 'ok' ? '[+]' : '[*]'}
              </span>{' '}
              PTY Proxy Console: {readiness.checks.kali?.detail || 'Waiting...'}
            </div>

            {/* Targets check */}
            <div>
              <span className={readiness.checks.targets?.status === 'ok' ? 'text-green-400' : 'text-yellow-500'}>
                {readiness.checks.targets?.status === 'ok' ? '[+]' : '[*]'}
              </span>{' '}
              Target Interfaces: {readiness.checks.targets?.status === 'ok' ? 'Connected' : 'Validating subnets...'}
              {readiness.checks.targets?.containers && (
                <div className="pl-4 mt-1 text-[11px] text-gray-500 space-y-1">
                  {Object.entries(readiness.checks.targets.containers).map(([name, detail]) => (
                    <div key={name} className="flex justify-between">
                      <span>{name}:</span>
                      <span className={detail.status === 'ok' ? 'text-green-400' : 'text-red-400'}>
                        {detail.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SIEM/Elastic check */}
            <div>
              <span className={readiness.checks.elasticsearch?.status === 'ok' ? 'text-green-400' : 'text-yellow-500'}>
                {readiness.checks.elasticsearch?.status === 'ok' ? '[+]' : '[*]'}
              </span>{' '}
              SIEM Pipeline: {readiness.checks.elasticsearch?.detail || 'Waiting...'}
            </div>

            {/* Redis check */}
            <div>
              <span className={readiness.checks.redis?.status === 'ok' ? 'text-green-400' : 'text-yellow-500'}>
                {readiness.checks.redis?.status === 'ok' ? '[+]' : '[*]'}
              </span>{' '}
              Cache Database: {readiness.checks.redis?.detail || 'Waiting...'}
            </div>

            {/* AI Monitor check */}
            <div>
              <span className={readiness.checks.openrouter?.status === 'ok' ? 'text-green-400' : 'text-yellow-500'}>
                {readiness.checks.openrouter?.status === 'ok' ? '[+]' : '[*]'}
              </span>{' '}
              Socratic Coach Context: {readiness.checks.openrouter?.detail || 'Waiting...'}
            </div>

            {readiness.status === 'ready' && (
              <div className="text-green-400 font-bold border border-green-500/30 bg-green-500/10 p-2 rounded animate-pulse mt-4">
                ALL SYSTEMS ACTIVE. LAUNCHING MISSION SHELL...
              </div>
            )}
          </div>
        </div>

        {/* Footer actions inside Sidebar */}
        <div className="pt-4 border-t border-gray-800">
          <div className="text-[10px] text-gray-500 mb-2">
            Elapsed time: {elapsed}s | Code: {readiness.status}
          </div>
          {(elapsed >= 30 || readiness.status === 'degraded') && (
            <button
              onClick={handleOverride}
              className="w-full bg-red-600/20 hover:bg-red-600 border border-red-500 text-red-200 py-2 px-3 rounded text-xs transition duration-200 tracking-wider font-bold animate-pulse"
            >
              OVERRIDE & LAUNCH
            </button>
          )}
        </div>
      </div>

      {/* Main Content: SVG Network Topology & Node Inspector */}
      <div className="flex-1 flex flex-col md:pl-6 justify-between mt-6 md:mt-0">
        <div className="flex-1 flex flex-col justify-center items-center relative min-h-[300px]">
          {/* Interactive SVG Diagram */}
          <svg className="w-full max-w-[700px] h-[360px] bg-black/30 border border-gray-800/80 rounded-lg p-4">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#222" strokeWidth="0.5" />
              </pattern>
              <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connections (Pathways with dash offset animation) */}
            {nodes.map((node) => {
              if (node.id === 'kali') return null
              // Find source node (always connects from Kali or WAF to other targets)
              const source = node.id === 'db' ? nodes.find((n) => n.id === 'webapp') : nodes.find((n) => n.id === 'kali')
              if (!source) return null

              const strokeColor = node.status === 'ok' ? '#10B981' : '#374151'
              
              return (
                <g key={`link-${node.id}`}>
                  {/* Connection Line */}
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={node.x}
                    y2={node.y}
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    strokeDasharray={node.status === 'ok' ? '5,5' : 'none'}
                    className={node.status === 'ok' ? 'animate-[dash_2s_linear_infinite]' : ''}
                  />
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node)}
              >
                {/* Node Ring */}
                <circle
                  r="16"
                  fill="#0D0F12"
                  stroke={node.color}
                  strokeWidth={selectedNode?.id === node.id ? '3' : '2'}
                  filter={node.status === 'ok' ? 'url(#glow-green)' : ''}
                  className="transition-all duration-300 hover:scale-110"
                />
                {/* Internal Dot */}
                <circle r="6" fill={node.color} />
                {/* Node Text */}
                <text
                  y="30"
                  textAnchor="middle"
                  fill="#9CA3AF"
                  fontSize="10"
                  className="font-bold select-none"
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>

          {/* SVG dash offset animation styles */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash {
              to {
                stroke-dashoffset: -20;
              }
            }
          `}} />
        </div>

        {/* Node Inspector Drawer */}
        <div className="border border-gray-800 bg-black/40 backdrop-blur-sm p-4 rounded-lg min-h-[140px] mt-4 flex flex-col justify-center">
          {selectedNode ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#38bdf8] font-bold text-sm">{selectedNode.label.toUpperCase()}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded border"
                  style={{ color: selectedNode.color, borderColor: selectedNode.color + '40', backgroundColor: selectedNode.color + '10' }}
                >
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
                <div>IP: <span className="text-gray-200">{selectedNode.ip}</span></div>
                <div>OS: <span className="text-gray-200">{selectedNode.os}</span></div>
                <div className="col-span-2">Open Ports: <span className="text-gray-200">{selectedNode.ports}</span></div>
              </div>
              <p className="text-xs text-gray-500 leading-normal">{selectedNode.desc}</p>
            </div>
          ) : (
            <div className="text-center text-xs text-gray-500 py-6">
              Click any node on the topology diagram to inspect interface specifications.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
