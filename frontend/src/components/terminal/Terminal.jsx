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
  const captureRef = useRef(null)
  const lineBufferRef = useRef('')
  const { writeOutput, focus } = useTerminal({ containerRef, onData, onCommand })

  // Expose writeOutput via ref so parent can push output
  if (pendingOutput) {
    pendingOutput.current = writeOutput
  }

  const sendInput = (data) => {
    if (onData) onData(data)

    if (data === '\r' || data === '\n') {
      const cmd = lineBufferRef.current.trim()
      if (cmd && onCommand) onCommand(cmd)
      lineBufferRef.current = ''
    } else if (data === '\x7f' || data === '\b') {
      lineBufferRef.current = lineBufferRef.current.slice(0, -1)
    } else if (data === '\x03') {
      lineBufferRef.current = ''
    } else if (data.length === 1 && data >= ' ') {
      lineBufferRef.current += data
    } else if (data.length > 1) {
      lineBufferRef.current += data.replace(/\r?\n/g, '')
    }
  }

  const handleKeyDown = (evt) => {
    if (evt.ctrlKey && evt.key.toLowerCase() === 'c') {
      evt.preventDefault()
      sendInput('\x03')
      return
    }
    if (evt.ctrlKey || evt.metaKey || evt.altKey) return

    let data = ''
    if (evt.key === 'Enter') data = '\r'
    else if (evt.key === 'Backspace') data = '\x7f'
    else if (evt.key === 'Tab') data = '\t'
    else if (evt.key.length === 1) data = evt.key

    if (!data) return
    evt.preventDefault()
    sendInput(data)
    evt.currentTarget.value = ''
  }

  const handlePaste = (evt) => {
    const text = evt.clipboardData?.getData('text')
    if (!text) return
    evt.preventDefault()
    sendInput(text)
    evt.currentTarget.value = ''
  }

  const focusCapture = () => {
    focus()
    captureRef.current?.focus()
  }

  return (
    <div className="relative w-full h-full" onMouseDown={focusCapture} onTouchStart={focusCapture}>
      <div
        ref={containerRef}
        className="w-full h-full terminal"
        style={{ padding: '16px', background: 'transparent' }}
      />
      <textarea
        ref={captureRef}
        aria-label="Terminal keyboard capture"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="absolute inset-0 z-20 h-full w-full resize-none border-0 bg-transparent p-0 text-transparent outline-none caret-transparent"
        onFocus={focus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  )
}
