import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

export function useTerminal({ containerRef, onCommand }) {
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const lineBufferRef = useRef('')
  const historyRestoredRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      theme: {
        background: '#030712',
        foreground: '#e5e7eb',
        cursor: '#6ee7b7',
        selectionBackground: '#374151',
        black: '#111827',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f9fafb',
      },
      scrollback: 2000,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitRef.current = fitAddon

    // Handle keyboard input — buffer until Enter
    term.onData((data) => {
      if (data === '\r') {
        const cmd = lineBufferRef.current
        lineBufferRef.current = ''
        term.write('\r\n')
        if (cmd.trim() && onCommand) onCommand(cmd)
      } else if (data === '\x7f') {
        // Backspace
        if (lineBufferRef.current.length > 0) {
          lineBufferRef.current = lineBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data >= ' ') {
        lineBufferRef.current += data
        term.write(data)
      }
    })

    // Listen for output from WebSocket
    const handleOutput = (evt) => {
      term.write(evt.detail?.data || '')
    }
    const handleHistory = (evt) => {
      if (historyRestoredRef.current) return
      const payload = evt.detail || {}
      const commands = Array.isArray(payload.commands) ? payload.commands : []
      const terminalChunks = Array.isArray(payload.terminal) ? payload.terminal : []

      if (commands.length > 0) {
        commands.forEach((cmd) => {
          term.write(`$ ${cmd}\r\n`)
        })
      }
      if (terminalChunks.length > 0) {
        terminalChunks.forEach((chunk) => {
          term.write(chunk || '')
        })
      }
      historyRestoredRef.current = true
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

  return { writeOutput }
}
