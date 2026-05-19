import { useEffect, useRef } from 'react'

/**
 * ScoreToast — renders a 2-second "-N pts — reason" banner when a score
 * deduction arrives. Rendered at workspace level via a fixed overlay.
 */
export default function ScoreToast({ delta, reason, onExpire }) {
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      onExpire?.()
    }, 2000)
    return () => window.clearTimeout(timerRef.current)
  }, [delta, reason, onExpire])

  if (!delta || delta >= 0) return null

  return (
    <div
      className="score-toast"
      role="status"
      aria-live="polite"
    >
      <span className="score-toast-delta">{delta} pts</span>
      {reason && <span className="score-toast-reason">— {reason}</span>}
    </div>
  )
}
