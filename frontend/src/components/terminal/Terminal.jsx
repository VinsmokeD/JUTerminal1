import { useRef } from 'react'
import { useTerminal } from '../../hooks/useTerminal'

/**
 * Real PTY terminal component.
 *
 * onData — raw keystrokes sent to backend (every character)
 * onCommand — extracted command string sent on Enter (for AI/discovery)
 */
export default function Terminal({ onData, onCommand, pendingOutput }) {
  const containerRef = useRef(null)
  const { writeOutput } = useTerminal({ containerRef, onData, onCommand })

  // Expose writeOutput via ref so parent can push output
  if (pendingOutput) {
    pendingOutput.current = writeOutput
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full terminal"
      style={{ padding: '16px', background: 'transparent' }}
    />
  )
}
