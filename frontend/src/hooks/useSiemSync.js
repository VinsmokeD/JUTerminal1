import { useEffect, useRef } from 'react'
import api from '../lib/api'
import { useSessionStore } from '../store/sessionStore'

/**
 * useSiemSync — keeps the SIEM feed reliably live without a page refresh.
 *
 * The live path is the WebSocket `siem_event` push. But Redis pub/sub has no
 * replay: if the socket briefly drops and reconnects (which the WS layer does
 * automatically), any events published during the gap are lost from the live
 * feed until the page is manually refreshed.
 *
 * This hook closes that gap by polling `/sessions/{id}/events` on a short
 * interval and merging the result into the store (dedup is by unique event id,
 * so this never duplicates events already delivered live). It also forces an
 * immediate refetch whenever the socket transitions back to `connected`, so a
 * reconnect recovers any missed telemetry within a second.
 *
 * @param {string|null} sessionId
 * @param {string} connectionState  from useWebSocket
 * @param {number} intervalMs        poll cadence (default 5s)
 */
export function useSiemSync(sessionId, connectionState, intervalMs = 5000) {
  const mergeSiemEvents = useSessionStore((s) => s.mergeSiemEvents)
  const prevConnRef = useRef(connectionState)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let timer = null

    const fetchEvents = async () => {
      if (cancelled || document.hidden) return
      try {
        const res = await api.get(`/sessions/${sessionId}/events`)
        if (!cancelled && Array.isArray(res.data)) mergeSiemEvents(res.data)
      } catch {
        // transient — next tick retries
      }
    }

    const tick = () => {
      fetchEvents()
      timer = window.setTimeout(tick, intervalMs)
    }

    // Recover immediately when a fresh page becomes visible again.
    const onVisible = () => { if (!document.hidden) fetchEvents() }
    document.addEventListener('visibilitychange', onVisible)

    tick()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sessionId, intervalMs, mergeSiemEvents])

  // On reconnect (disconnected/connecting -> connected), force a catch-up fetch.
  useEffect(() => {
    const prev = prevConnRef.current
    prevConnRef.current = connectionState
    if (!sessionId) return
    if (connectionState === 'connected' && prev !== 'connected') {
      api.get(`/sessions/${sessionId}/events`)
        .then((res) => { if (Array.isArray(res.data)) mergeSiemEvents(res.data) })
        .catch(() => {})
    }
  }, [connectionState, sessionId, mergeSiemEvents])
}
