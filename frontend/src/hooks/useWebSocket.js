import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '../store/sessionStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost/ws'

export function useWebSocket(sessionId) {
  const wsRef = useRef(null)
  const { addSiemEvent, setScore, setAiMode, addDiscoveries, setPendingEvidence } = useSessionStore()

  useEffect(() => {
    if (!sessionId) return

    const token = localStorage.getItem('token')
    const ws = new WebSocket(`${WS_URL}/${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ token }))
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        switch (msg.type) {
          case 'siem_event':
            addSiemEvent(msg.data)
            break
          case 'terminal_output':
            window.dispatchEvent(new CustomEvent('terminal:output', { detail: msg.data }))
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

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
    }
  }, [sessionId])

  // Send raw keystrokes to Docker PTY (character-by-character)
  const sendRawInput = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'terminal_raw', data }))
    }
  }, [])

  // Send complete command string (for AI/discovery tracking after Enter)
  const sendCommand = useCallback((command) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'terminal_command', data: command }))
    }
  }, [])

  const requestHint = useCallback((level) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_hint', level }))
    }
  }, [])

  const toggleMode = useCallback((mode) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'toggle_mode', mode }))
    }
  }, [])

  return { sendRawInput, sendCommand, requestHint, toggleMode }
}
