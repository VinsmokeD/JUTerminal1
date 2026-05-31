import { useCallback } from 'react'
import { useCursorStore } from '../store/cursorStore'

/**
 * useCursorIntent — attach to any element to set cursor intent on hover.
 *
 * Usage:
 *   const cursor = useCursorIntent({ intent: 'engage', label: 'ENGAGE', mode: 'red' })
 *   <button {...cursor.bind}>…</button>
 *
 * data-cursor attribute values: 'engage' | 'inspect' | 'launch' | 'red' | 'blue' | 'default'
 */
export default function useCursorIntent({
  intent = 'default',
  label  = '',
  mode   = 'neutral',
} = {}) {
  const setCursor   = useCursorStore((s) => s.setCursor)
  const resetCursor = useCursorStore((s) => s.resetCursor)

  const onMouseEnter = useCallback(
    () => setCursor(intent, label, mode),
    [intent, label, mode, setCursor],
  )
  const onMouseLeave = useCallback(() => resetCursor(), [resetCursor])

  return { bind: { onMouseEnter, onMouseLeave } }
}
