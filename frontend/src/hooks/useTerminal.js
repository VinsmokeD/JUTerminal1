import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

/**
 * Real PTY terminal hook.
 *
 * Every keystroke is sent immediately to the backend (which forwards to
 * Docker exec PTY). Every byte from Docker is written to xterm. Line
 * editing, tab completion, and history are all handled by bash inside
 * the container — NOT by the frontend.
 *
 * onData(data) — called for every keystroke/paste, sends raw to backend
 * onCommand(cmd) — called when Enter is detected, for AI/discovery tracking
 */
export function useTerminal({ containerRef, onData, onCommand }) {
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const lineBufferRef = useRef('')    // Track current line for onCommand extraction
  const historyRestoredRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", "Courier New", monospace',
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      letterSpacing: 0,
      lineHeight: 1.2,
      theme: {
        background: '#0a0e14',
        foreground: '#d4d4d8',
        cursor: '#22c55e',
        cursorAccent: '#0a0e14',
        selectionBackground: '#27272a',
        selectionForeground: '#fafafa',
        selectionInactiveBackground: '#1e1e22',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      scrollback: 5000,
      allowProposedApi: true,
      convertEol: false, // Raw PTY — do NOT convert EOL
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitRef.current = fitAddon

    // Raw PTY mode: send every keystroke directly to the backend.
    // Bash inside Docker handles line editing, tab completion, history.
    term.onData((data) => {
      // Send raw keystrokes to backend → Docker PTY
      if (onData) onData(data)

      // Track line buffer for command extraction (AI/discovery)
      if (data === '\r' || data === '\n') {
        const cmd = lineBufferRef.current.trim()
        if (cmd && onCommand) onCommand(cmd)
        lineBufferRef.current = ''
      } else if (data === '\x7f' || data === '\b') {
        lineBufferRef.current = lineBufferRef.current.slice(0, -1)
      } else if (data === '\x03') {
        // Ctrl+C — reset line buffer
        lineBufferRef.current = ''
      } else if (data.length === 1 && data >= ' ') {
        lineBufferRef.current += data
      }
      // Arrow keys, tab, etc. are sent raw — bash handles them
    })

    // Listen for output from WebSocket (Docker PTY output)
    const handleOutput = (evt) => {
      term.write(evt.detail?.data || '')
    }
    const handleHistory = (evt) => {
      if (historyRestoredRef.current) return
      const payload = evt.detail || {}
      const terminalChunks = Array.isArray(payload.terminal) ? payload.terminal : []
      const commands = Array.isArray(payload.commands) ? payload.commands : []

      // Batch writes using requestAnimationFrame to prevent rendering jank
      requestAnimationFrame(() => {
        if (terminalChunks.length > 0) {
          terminalChunks.forEach((chunk) => {
            term.write(chunk || '')
          })
        } else if (commands.length > 0) {
          commands.forEach((cmd) => {
            term.write(`\x1b[0;33m$ ${cmd}\x1b[0m\r\n`)
          })
        }
        historyRestoredRef.current = true
      })
    }
    window.addEventListener('terminal:output', handleOutput)
    window.addEventListener('terminal:history', handleHistory)

    // Resize observer
    const ro = new ResizeObserver(() => fitAddon.fit())
    ro.observe(containerRef.current)

    return () => {
      window.removeEventListener('terminal:output', handleOutput)
      window.removeEventListener('terminal:history', handleHistory)
      ro.disconnect()
      term.dispose()
    }
  }, [])

  const writeOutput = (text) => {
    termRef.current?.write(text)
  }

  return { writeOutput, termRef }
}
