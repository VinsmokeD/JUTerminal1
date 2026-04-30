import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

/**
 * Real PTY terminal hook.
 *
 * Every keystroke is sent immediately to the backend, which forwards to
 * Docker exec PTY. Docker output is written back into xterm.
 */
export function useTerminal({ containerRef, onData, onCommand }) {
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const lineBufferRef = useRef('')
  const historyRestoredRef = useRef(false)
  const lastXtermDataAtRef = useRef(0)
  const onDataRef = useRef(onData)
  const onCommandRef = useRef(onCommand)

  useEffect(() => { onDataRef.current = onData }, [onData])
  useEffect(() => { onCommandRef.current = onCommand }, [onCommand])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 12.5,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", "Courier New", monospace',
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      letterSpacing: 0,
      lineHeight: 1.8,
      allowTransparency: true,
      theme: {
        background: 'transparent',
        foreground: '#8890a4',
        cursor: '#ff3b3b',
        cursorAccent: '#0d0f14',
        selectionBackground: 'rgba(59,139,255,0.3)',
        selectionForeground: '#e8eaf0',
        selectionInactiveBackground: 'rgba(59,139,255,0.1)',
        black: '#13161d',
        red: '#ff3b3b',
        green: '#00ff88',
        yellow: '#ffaa00',
        blue: '#3b8bff',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e8eaf0',
        brightBlack: '#1a1d26',
        brightRed: '#ff2244',
        brightGreen: '#00ff88',
        brightYellow: '#ffaa00',
        brightBlue: '#3b8bff',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      scrollback: 5000,
      allowProposedApi: true,
      convertEol: false,
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)

    term.open(containerRef.current)
    fitAddon.fit()
    term.focus()

    termRef.current = term
    fitRef.current = fitAddon

    const handleInputData = (data) => {
      if (onDataRef.current) onDataRef.current(data)

      if (data === '\r' || data === '\n') {
        const cmd = lineBufferRef.current.trim()
        if (cmd && onCommandRef.current) onCommandRef.current(cmd)
        lineBufferRef.current = ''
      } else if (data === '\x7f' || data === '\b') {
        lineBufferRef.current = lineBufferRef.current.slice(0, -1)
      } else if (data === '\x03') {
        lineBufferRef.current = ''
      } else if (data.length === 1 && data >= ' ') {
        lineBufferRef.current += data
      }
    }

    term.onData((data) => {
      lastXtermDataAtRef.current = Date.now()
      handleInputData(data)
    })

    const handleOutput = (evt) => {
      term.write(evt.detail?.data || '')
    }
    const handleHistory = (evt) => {
      if (historyRestoredRef.current) return
      const payload = evt.detail || {}
      const terminalChunks = Array.isArray(payload.terminal) ? payload.terminal : []
      const commands = Array.isArray(payload.commands) ? payload.commands : []

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

    const focusTerminal = () => term.focus()
    const fallbackKeyDown = (evt) => {
      if (evt.ctrlKey || evt.metaKey || evt.altKey) return

      let data = ''
      if (evt.key === 'Enter') data = '\r'
      else if (evt.key === 'Backspace') data = '\x7f'
      else if (evt.key === 'Tab') data = '\t'
      else if (evt.key.length === 1) data = evt.key

      if (!data) return
      const before = lastXtermDataAtRef.current
      window.setTimeout(() => {
        if (lastXtermDataAtRef.current === before) {
          handleInputData(data)
        }
      }, 0)
    }
    const fallbackPaste = (evt) => {
      const text = evt.clipboardData?.getData('text')
      if (!text) return
      const before = lastXtermDataAtRef.current
      window.setTimeout(() => {
        if (lastXtermDataAtRef.current === before) {
          handleInputData(text)
        }
      }, 0)
    }
    containerRef.current.addEventListener('mousedown', focusTerminal)
    containerRef.current.addEventListener('touchstart', focusTerminal)
    containerRef.current.addEventListener('keydown', fallbackKeyDown, true)
    containerRef.current.addEventListener('paste', fallbackPaste, true)

    const ro = new ResizeObserver(() => fitAddon.fit())
    ro.observe(containerRef.current)

    return () => {
      window.removeEventListener('terminal:output', handleOutput)
      window.removeEventListener('terminal:history', handleHistory)
      containerRef.current?.removeEventListener('mousedown', focusTerminal)
      containerRef.current?.removeEventListener('touchstart', focusTerminal)
      containerRef.current?.removeEventListener('keydown', fallbackKeyDown, true)
      containerRef.current?.removeEventListener('paste', fallbackPaste, true)
      ro.disconnect()
      term.dispose()
    }
  }, [])

  const writeOutput = (text) => {
    termRef.current?.write(text)
  }

  const focus = () => {
    termRef.current?.focus()
  }

  return { writeOutput, termRef, focus }
}
