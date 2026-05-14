import { useEffect, useRef, useState } from 'react'
import { useTerminal } from '../../hooks/useTerminal'

/**
 * Real PTY terminal component.
 *
 * onData — raw keystrokes sent to backend (every character)
 * onCommand — extracted command string sent on Enter (for AI/discovery)
 */
export default function Terminal({ onData, onCommand, pendingOutput, connectionState = 'connected', sessionId }) {
  const containerRef = useRef(null)
  const captureRef = useRef(null)
  const lineBufferRef = useRef('')
  const [isFocused, setIsFocused] = useState(false)
  const { writeOutput } = useTerminal({ containerRef, onData, onCommand, sessionId })

  // Expose writeOutput via ref so parent can push output
  if (pendingOutput) {
    pendingOutput.current = writeOutput
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      captureRef.current?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const rememberInput = (data) => {
    const chars = data.replace(/\r\n/g, '\n').split('')
    chars.forEach((char) => {
      if (char === '\r' || char === '\n') {
        const cmd = lineBufferRef.current.trim()
        if (cmd && onCommand) onCommand(cmd)
        lineBufferRef.current = ''
      } else if (char === '\x7f' || char === '\b') {
        lineBufferRef.current = lineBufferRef.current.slice(0, -1)
      } else if (char === '\x03' || char === '\x04') {
        lineBufferRef.current = ''
      } else if (char >= ' ' && char !== '\x1b') {
        lineBufferRef.current += char
      }
    })
  }

  const sendInput = (data, trackCommand = true) => {
    if (onData) onData(data)
    if (trackCommand) rememberInput(data)
  }

  const keyToTerminalData = (evt) => {
    if (evt.ctrlKey && !evt.metaKey && !evt.altKey) {
      const key = evt.key.toLowerCase()
      if (key === 'c') return { data: '\x03', trackCommand: true }
      if (key === 'd') return { data: '\x04', trackCommand: true }
      if (key === 'l') return { data: '\x0c', trackCommand: false }
      if (key === 'r') return { data: '\x12', trackCommand: false }
      return null
    }
    if (evt.metaKey || evt.altKey) return null

    const specialKeys = {
      Enter: '\r',
      Backspace: '\x7f',
      Tab: '\t',
      Escape: '\x1b',
      ArrowUp: '\x1b[A',
      ArrowDown: '\x1b[B',
      ArrowRight: '\x1b[C',
      ArrowLeft: '\x1b[D',
      Home: '\x1b[H',
      End: '\x1b[F',
      Delete: '\x1b[3~',
      PageUp: '\x1b[5~',
      PageDown: '\x1b[6~',
    }
    if (specialKeys[evt.key]) {
      return { data: specialKeys[evt.key], trackCommand: !evt.key.startsWith('Arrow') && evt.key !== 'Home' && evt.key !== 'End' && evt.key !== 'Delete' && evt.key !== 'PageUp' && evt.key !== 'PageDown' && evt.key !== 'Escape' }
    }
    if (evt.key.length === 1) return { data: evt.key, trackCommand: true }
    return null
  }

  const handleKeyDown = (evt) => {
    const mapped = keyToTerminalData(evt)
    if (!mapped) return
    evt.preventDefault()
    sendInput(mapped.data, mapped.trackCommand)
    evt.currentTarget.value = ''
  }

  const handleInput = (evt) => {
    const text = evt.currentTarget.value
    if (!text) return
    sendInput(text)
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
    captureRef.current?.focus({ preventScroll: true })
  }

  const statusLabel = {
    connected: 'Live Kali PTY',
    connecting: 'Connecting terminal...',
    disconnected: 'Reconnecting; input queued',
    unauthorized: 'Terminal auth failed',
  }[connectionState] || 'Terminal offline'
  const statusTone = connectionState === 'connected' ? 'border-green-signal/40 text-green-signal' : 'border-cs-red/40 text-cs-red'

  return (
    <div
      className={`relative h-full w-full rounded-cs-sm transition-shadow ${isFocused ? 'ring-1 ring-cs-red/45' : 'ring-1 ring-transparent'}`}
      onMouseDown={focusCapture}
      onTouchStart={focusCapture}
    >
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
        inputMode="text"
        className="absolute inset-0 z-20 h-full w-full resize-none border-0 bg-transparent p-0 text-transparent outline-none caret-transparent"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <div className={`pointer-events-none absolute right-3 top-3 z-30 rounded-cs-sm border bg-surface-1/90 px-2.5 py-1 text-[10px] font-mono uppercase ${statusTone}`}>
        {statusLabel}
      </div>
    </div>
  )
}
