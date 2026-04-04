import { useRef } from 'react'
import { useTerminal } from '../../hooks/useTerminal'

export default function Terminal({ onCommand, pendingOutput }) {
  const containerRef = useRef(null)
  const { writeOutput } = useTerminal({ containerRef, onCommand })

  // Expose writeOutput via ref so parent can push output
  if (pendingOutput) {
    pendingOutput.current = writeOutput
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-950"
      style={{ padding: '4px' }}
    />
  )
}
