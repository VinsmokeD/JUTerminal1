import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '../store/sessionStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost/ws'

export function useWebSocket(sessionId) {
  const wsRef = useRef(null)
  const { addSiemEvent, setScore } = useSessionStore()

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
        if (msg.type === 'siem_event') {
          addSiemEvent(msg.data)
        } else if (msg.type === 'terminal_output') {
          // Dispatched via custom event so Terminal component can consume it
          window.dispatchEvent(new CustomEvent('terminal:output', { detail: msg.data }))
        } else if (msg.type === 'ai_hint') {
          window.dispatchEvent(new CustomEvent('ai:hint', { detail: msg.data }))
        } else if (msg.type === 'score_update') {
          setScore(msg.data.score)
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

  const sendCommand = useCallback((command) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'terminal_input', data: command }))
    }
  }, [])

  const requestHint = useCallback((level) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_hint', level }))
    }
  }, [])

  return { sendCommand, requestHint }
}
