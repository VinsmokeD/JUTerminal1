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
  const cmdHistoryRef = useRef([])
  const cmdHistoryIndexRef = useRef(-1)

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
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitRef.current = fitAddon

    // Handle keyboard input — buffer until Enter, support history
    term.onData((data) => {
      if (data === '\r') {
        const cmd = lineBufferRef.current
        lineBufferRef.current = ''
        // Save to command history
        if (cmd.trim()) {
          cmdHistoryRef.current.unshift(cmd)
          if (cmdHistoryRef.current.length > 50) cmdHistoryRef.current.pop()
        }
        cmdHistoryIndexRef.current = -1
        term.write('\r\n')
        if (cmd.trim() && onCommand) onCommand(cmd)
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (lineBufferRef.current.length > 0) {
          lineBufferRef.current = lineBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data === '\x1b[A') {
        // Up arrow — previous command
        if (cmdHistoryRef.current.length > 0) {
          const newIdx = Math.min(cmdHistoryIndexRef.current + 1, cmdHistoryRef.current.length - 1)
          if (newIdx !== cmdHistoryIndexRef.current) {
            cmdHistoryIndexRef.current = newIdx
            _replaceInput(term, lineBufferRef, cmdHistoryRef.current[newIdx])
          }
        }
      } else if (data === '\x1b[B') {
        // Down arrow — next command
        if (cmdHistoryIndexRef.current > 0) {
          cmdHistoryIndexRef.current -= 1
          _replaceInput(term, lineBufferRef, cmdHistoryRef.current[cmdHistoryIndexRef.current])
        } else if (cmdHistoryIndexRef.current === 0) {
          cmdHistoryIndexRef.current = -1
          _replaceInput(term, lineBufferRef, '')
        }
      } else if (data === '\x03') {
        // Ctrl+C
        lineBufferRef.current = ''
        cmdHistoryIndexRef.current = -1
        term.write('^C\r\n')
      } else if (data === '\x0c') {
        // Ctrl+L — clear screen
        term.clear()
      } else if (data === '\t') {
        // Tab — basic command completion
        const partial = lineBufferRef.current
        const match = _tabComplete(partial)
        if (match && match !== partial) {
          const extra = match.slice(partial.length)
          lineBufferRef.current = match
          term.write(extra)
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

/** Replace current input line with new text */
function _replaceInput(term, bufRef, text) {
  // Erase current line content
  const oldLen = bufRef.current.length
  if (oldLen > 0) {
    term.write('\b'.repeat(oldLen) + ' '.repeat(oldLen) + '\b'.repeat(oldLen))
  }
  bufRef.current = text
  term.write(text)
}

/** Basic tab completion for common pentesting tools */
const _TOOLS = [
  'nmap', 'gobuster', 'sqlmap', 'nikto', 'hydra', 'curl', 'whatweb',
  'bloodhound', 'crackmapexec', 'netexec', 'hashcat',
  'impacket-GetUserSPNs', 'impacket-secretsdump', 'impacket-psexec', 'impacket-wmiexec',
  'msfconsole', 'msfvenom', 'theHarvester',
  'whoami', 'hostname', 'ifconfig', 'ping', 'cat', 'ls', 'pwd', 'id', 'help', 'clear',
]
function _tabComplete(partial) {
  if (!partial) return null
  const matches = _TOOLS.filter(t => t.startsWith(partial.toLowerCase()))
  if (matches.length === 1) return matches[0] + ' '
  return null
}
