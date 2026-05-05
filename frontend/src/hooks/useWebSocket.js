import { useEffect, useRef, useCallback, useState } from 'react'
import { useSessionStore } from '../store/sessionStore'

const DEFAULT_WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
const WS_URL = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL

export function useWebSocket(sessionId) {
  const wsRef = useRef(null)
  const pendingFramesRef = useRef([])
  const [connectionState, setConnectionState] = useState('disconnected')
  const { addSiemEvent, setScore, setAiMode, addDiscoveries, setPendingEvidence } = useSessionStore()

  useEffect(() => {
    if (!sessionId) return

    const token = localStorage.getItem('token')
    const ws = new WebSocket(`${WS_URL}/${sessionId}`)
    wsRef.current = ws
    pendingFramesRef.current = []
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
            window.dispatchEvent(new CustomEvent('terminal:output', {
              detail: typeof msg.data === 'string' ? { data: msg.data } : msg.data,
            }))
            break
          case 'history':
            window.dispatchEvent(new CustomEvent('terminal:history', { detail: msg.data }))
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
      pendingFramesRef.current = []
      setConnectionState(evt.code === 4001 ? 'unauthorized' : 'disconnected')
    }

    return () => {
      pendingFramesRef.current = []
      ws.close()
    }
  }, [sessionId, addSiemEvent, setScore, setAiMode, addDiscoveries, setPendingEvidence])

  const sendFrame = useCallback((frame) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame))
      return
    }
    if (ws?.readyState === WebSocket.CONNECTING) {
      pendingFramesRef.current.push(frame)
    }
  }, [])

  // Send raw keystrokes to Docker PTY (character-by-character)
  const sendRawInput = useCallback((data) => {
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
