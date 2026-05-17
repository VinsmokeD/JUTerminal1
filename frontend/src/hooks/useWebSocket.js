import { useEffect, useRef, useCallback, useState } from 'react'
import { useSessionStore } from '../store/sessionStore'

const DEFAULT_WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
const WS_URL = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL
const terminalBacklogs = new Map()

export function useWebSocket(sessionId) {
  const wsRef = useRef(null)
  const pendingFramesRef = useRef([])
  const pendingSessionRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const lastRawInputAtRef = useRef(0)
  const lastTerminalOutputAtRef = useRef(0)
  const [reconnectTick, setReconnectTick] = useState(0)
  const [connectionState, setConnectionState] = useState('disconnected')
  const { addSiemEvent, setScore, setAiMode, setActiveBranch, addDiscoveries, setPendingEvidence, setPhase } = useSessionStore()

  useEffect(() => {
    if (!sessionId) return
    let disposed = false
    if (pendingSessionRef.current !== sessionId) {
      pendingFramesRef.current = []
      pendingSessionRef.current = sessionId
    }
    lastRawInputAtRef.current = 0
    lastTerminalOutputAtRef.current = 0

    const token = localStorage.getItem('token')
    const ws = new WebSocket(`${WS_URL}/${sessionId}`)
    wsRef.current = ws
    terminalBacklogs.set(sessionId, { history: null, output: [] })
    setConnectionState('connecting')

    ws.onopen = () => {
      ws.send(JSON.stringify({ token }))
      setConnectionState('connected')
      pendingFramesRef.current.forEach((frame) => ws.send(JSON.stringify(frame)))
      pendingFramesRef.current = []
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        switch (msg.type) {
          case 'siem_event':
            addSiemEvent(msg.data)
            break
          case 'terminal_output':
            {
              lastTerminalOutputAtRef.current = Date.now()
              const detail = typeof msg.data === 'string' ? { data: msg.data } : msg.data
              const backlog = terminalBacklogs.get(sessionId) || { history: null, output: [] }
              backlog.output = [...backlog.output, detail?.data || ''].slice(-250)
              terminalBacklogs.set(sessionId, backlog)
              window.dispatchEvent(new CustomEvent('terminal:output', {
                detail: { ...detail, sessionId },
              }))
            }
            break
          case 'history':
            {
              const backlog = terminalBacklogs.get(sessionId) || { history: null, output: [] }
              backlog.history = msg.data
              terminalBacklogs.set(sessionId, backlog)
              window.dispatchEvent(new CustomEvent('terminal:history', {
                detail: { ...msg.data, sessionId },
              }))
            }
            break
          case 'ai_hint':
            window.dispatchEvent(new CustomEvent('ai:hint', { detail: msg.data }))
            break
          case 'score_update':
            setScore(msg.data.score)
            break
          case 'mode_changed':
            setAiMode(msg.data.mode)
            break
          case 'phase_update':
            setPhase(msg.data.phase)
            break
          case 'branch_update':
            setActiveBranch(msg.data)
            break
          case 'output_insight':
            window.dispatchEvent(new CustomEvent('terminal:insight', {
              detail: { ...msg.data, sessionId },
            }))
            break
          case 'auto_evidence':
            addDiscoveries(msg.data.discoveries)
            if (Object.values(msg.data.discoveries).some(arr => arr.length > 0)) {
              setPendingEvidence(msg.data)
              window.dispatchEvent(new CustomEvent('evidence:discovered', { detail: msg.data }))
            }
            break
        }
      } catch {
        // ignore malformed
      }
    }

    ws.onerror = () => {
      setConnectionState('disconnected')
    }

    ws.onclose = (evt) => {
      wsRef.current = null
      const unauthorized = evt.code === 4001
      if (unauthorized) pendingFramesRef.current = []
      setConnectionState(unauthorized ? 'unauthorized' : 'disconnected')
      if (!disposed && !unauthorized) {
        reconnectTimerRef.current = window.setTimeout(() => {
          setReconnectTick((tick) => tick + 1)
        }, 1200)
      }
    }

    return () => {
      disposed = true
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      ws.close()
    }
  }, [sessionId, reconnectTick, addSiemEvent, setScore, setAiMode, setActiveBranch, addDiscoveries, setPendingEvidence, setPhase])

  useEffect(() => {
    if (!sessionId) return
    const timer = window.setInterval(() => {
      const ws = wsRef.current
      if (connectionState !== 'connected' || ws?.readyState !== WebSocket.OPEN) return
      const lastInputAt = lastRawInputAtRef.current
      if (!lastInputAt || lastTerminalOutputAtRef.current >= lastInputAt) return
      if (Date.now() - lastInputAt > 8000) {
        setConnectionState('disconnected')
        try {
          ws.close(4000, 'terminal echo stalled')
        } catch {
          // reconnect will be handled by onclose
        }
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [sessionId, connectionState])

  const sendFrame = useCallback((frame) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame))
      return
    }
    if (
      ws?.readyState === WebSocket.CONNECTING ||
      ws?.readyState === WebSocket.CLOSING ||
      !ws ||
      ws.readyState === WebSocket.CLOSED
    ) {
      pendingFramesRef.current = [...pendingFramesRef.current, frame].slice(-500)
    }
  }, [])

  // Send raw keystrokes to Docker PTY (character-by-character)
  const sendRawInput = useCallback((data) => {
    lastRawInputAtRef.current = Date.now()
    sendFrame({ type: 'terminal_raw', data })
  }, [sendFrame])

  // Send complete command string (for AI/discovery tracking after Enter)
  const sendCommand = useCallback((command) => {
    sendFrame({ type: 'terminal_command', data: command })
  }, [sendFrame])

  const requestHint = useCallback((level) => {
    sendFrame({ type: 'request_hint', level })
  }, [sendFrame])

  const toggleMode = useCallback((mode) => {
    sendFrame({ type: 'toggle_mode', mode })
  }, [sendFrame])

  return { sendRawInput, sendCommand, requestHint, toggleMode, connectionState }
}

export function getTerminalBacklog(sessionId) {
  return terminalBacklogs.get(sessionId) || { history: null, output: [] }
}
