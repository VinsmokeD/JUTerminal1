import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { SearchAddon } from 'xterm-addon-search'
import { getTerminalBacklog } from './useWebSocket'
import 'xterm/css/xterm.css'

const FONT_STORAGE_KEY = 'cs.terminal.font'
const THEME_STORAGE_KEY = 'cs.terminal.theme'

const clampFont = (value) => Math.min(20, Math.max(10, Number(value) || 12.5))

const readStoredFont = () => {
  try {
    return clampFont(localStorage.getItem(FONT_STORAGE_KEY) || 12.5)
  } catch {
    return 12.5
  }
}

const readStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark'
  } catch {
    return 'dark'
  }
}

const THEMES = {
  dark: {
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
  contrast: {
    background: 'transparent',
    foreground: '#f4f7fb',
    cursor: '#00ff88',
    cursorAccent: '#08090c',
    selectionBackground: 'rgba(0,255,136,0.34)',
    selectionForeground: '#ffffff',
    selectionInactiveBackground: 'rgba(0,255,136,0.16)',
    black: '#050609',
    red: '#ff5c7a',
    green: '#00ff99',
    yellow: '#ffd166',
    blue: '#7ab3ff',
    magenta: '#d1a3ff',
    cyan: '#56e7ff',
    white: '#f4f7fb',
    brightBlack: '#33394a',
    brightRed: '#ff7790',
    brightGreen: '#55ffbb',
    brightYellow: '#ffe08a',
    brightBlue: '#9cc6ff',
    brightMagenta: '#e0baff',
    brightCyan: '#8ef1ff',
    brightWhite: '#ffffff',
  },
}

/**
 * Real PTY terminal hook.
 *
 * Every keystroke is sent immediately to the backend, which forwards to
 * Docker exec PTY. Docker output is written back into xterm.
 */
export function useTerminal({
  containerRef, onData, onCommand, sessionId,
  autoCopySelection = false,
  inputDisabled = false,
  initialFontSize = readStoredFont(),
  initialTheme = readStoredTheme()
}) {
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const searchRef = useRef(null)
  const lineBufferRef = useRef('')
  const historyRestoredRef = useRef(false)
  const onDataRef = useRef(onData)
  const onCommandRef = useRef(onCommand)
  const autoCopyRef = useRef(autoCopySelection)
  const inputDisabledRef = useRef(inputDisabled)
  const copyTimerRef = useRef(null)
  const [fontSize, setFontSizeState] = useState(clampFont(initialFontSize))
  const [themeName, setThemeNameState] = useState(initialTheme)
  const [selection, setSelection] = useState('')
  const [renderer, setRenderer] = useState('dom')

  useEffect(() => { onDataRef.current = onData }, [onData])
  useEffect(() => { onCommandRef.current = onCommand }, [onCommand])
  useEffect(() => { autoCopyRef.current = autoCopySelection }, [autoCopySelection])
  useEffect(() => { inputDisabledRef.current = inputDisabled }, [inputDisabled])

  const trackCommandInput = useCallback((data) => {
    if (!data || data.startsWith('\x1b')) return
    const chars = data.replace(/\r\n/g, '\n').split('')
    chars.forEach((char) => {
      if (char === '\r' || char === '\n') {
        const cmd = lineBufferRef.current.trim()
        if (cmd && onCommandRef.current) onCommandRef.current(cmd)
        lineBufferRef.current = ''
      } else if (char === '\x7f' || char === '\b') {
        lineBufferRef.current = lineBufferRef.current.slice(0, -1)
      } else if (char === '\x03' || char === '\x04') {
        lineBufferRef.current = ''
      } else if (char >= ' ') {
        lineBufferRef.current += char
      }
    })
  }, [])

  const sendInput = useCallback((data) => {
    if (!data) return
    if (inputDisabledRef.current) return
    if (onDataRef.current) onDataRef.current(data)
    trackCommandInput(data)
  }, [trackCommandInput])

  useEffect(() => {
    const terminalElement = containerRef.current
    if (!terminalElement) return
    historyRestoredRef.current = false
    lineBufferRef.current = ''

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", "Courier New", monospace',
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      letterSpacing: 0,
      lineHeight: 1.8,
      allowTransparency: true,
      theme: THEMES[themeName] || THEMES.dark,
      scrollback: 5000,
      allowProposedApi: true,
      disableStdin: inputDisabledRef.current,
      convertEol: false,
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    const searchAddon = new SearchAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)
    term.loadAddon(searchAddon)

    term.open(terminalElement)
    setRenderer('dom')

    fitAddon.fit()
    term.focus()

    termRef.current = term
    fitRef.current = fitAddon
    searchRef.current = searchAddon

    term.onData((data) => {
      sendInput(data)
    })

    term.onSelectionChange(() => {
      const text = term.getSelection() || ''
      setSelection(text)
      if (!autoCopyRef.current || !text) return
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        navigator.clipboard?.writeText(text).catch(() => {})
      }, 200)
    })

    const handleOutput = (evt) => {
      if (evt.detail?.sessionId && evt.detail.sessionId !== sessionId) return
      term.write(evt.detail?.data || '', () => term.scrollToBottom())
    }
    const handleHistory = (evt) => {
      if (evt.detail?.sessionId && evt.detail.sessionId !== sessionId) return
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
        term.scrollToBottom()
        historyRestoredRef.current = true
      })
    }
    window.addEventListener('terminal:output', handleOutput)
    window.addEventListener('terminal:history', handleHistory)

    const backlog = sessionId ? getTerminalBacklog(sessionId) : null
    if (backlog?.history) {
      handleHistory({ detail: { ...backlog.history, sessionId } })
    }
    if (backlog?.output?.length) {
      backlog.output.forEach((data) => term.write(data || '', () => term.scrollToBottom()))
    }

    const focusTerminal = () => term.focus()
    terminalElement.addEventListener('mousedown', focusTerminal)
    terminalElement.addEventListener('touchstart', focusTerminal)

    const ro = new ResizeObserver(() => fitAddon.fit())
    ro.observe(terminalElement)

    return () => {
      window.removeEventListener('terminal:output', handleOutput)
      window.removeEventListener('terminal:history', handleHistory)
      window.clearTimeout(copyTimerRef.current)
      terminalElement.removeEventListener('mousedown', focusTerminal)
      terminalElement.removeEventListener('touchstart', focusTerminal)
      ro.disconnect()
      searchRef.current = null
      fitRef.current = null
      termRef.current = null
      term.dispose()
    }
  }, [containerRef, fontSize, sendInput, sessionId, themeName])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.fontSize = fontSize
    fitRef.current?.fit()
  }, [fontSize])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.theme = THEMES[themeName] || THEMES.dark
  }, [themeName])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.disableStdin = inputDisabled
  }, [inputDisabled])

  const writeOutput = useCallback((text) => {
    termRef.current?.write(text)
  }, [])

  const focus = useCallback(() => {
    termRef.current?.focus()
  }, [])

  const setFontSize = useCallback((next) => {
    setFontSizeState((current) => clampFont(typeof next === 'function' ? next(current) : next))
  }, [])

  const setTheme = useCallback((next) => {
    setThemeNameState(THEMES[next] ? next : 'dark')
  }, [])

  const copyText = useCallback(async (text) => {
    if (!text) return false
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }, [])

  const copySelection = useCallback(() => copyText(termRef.current?.getSelection() || selection), [copyText, selection])

  const copyAll = useCallback(() => {
    const buffer = termRef.current?.buffer?.active
    if (!buffer) return Promise.resolve(false)
    const lines = []
    for (let i = 0; i < buffer.length; i += 1) {
      const line = buffer.getLine(i)?.translateToString(true)
      if (line !== undefined) lines.push(line)
    }
    return copyText(lines.join('\n').replace(/\n+$/g, ''))
  }, [copyText])

  const pasteText = useCallback((text) => {
    if (!text) return
    sendInput(text)
    focus()
  }, [focus, sendInput])

  const pasteClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      pasteText(text)
      return true
    } catch {
      return false
    }
  }, [pasteText])

  const clear = useCallback(() => {
    termRef.current?.clear()
    termRef.current?.write('\x1b[2J\x1b[H')
    focus()
  }, [focus])

  const reset = useCallback(() => {
    termRef.current?.reset()
    lineBufferRef.current = ''
    focus()
  }, [focus])

  const findNext = useCallback((query) => {
    if (!query) return false
    focus()
    return searchRef.current?.findNext(query, { incremental: false }) || false
  }, [focus])

  const findPrev = useCallback((query) => {
    if (!query) return false
    focus()
    return searchRef.current?.findPrevious(query, { incremental: false }) || false
  }, [focus])

  const scrollToTop = useCallback(() => termRef.current?.scrollToTop(), [])
  const scrollToBottom = useCallback(() => termRef.current?.scrollToBottom(), [])
  const fit = useCallback(() => fitRef.current?.fit(), [])

  return {
    writeOutput,
    termRef,
    focus,
    fontSize,
    setFontSize,
    increaseFont: () => setFontSize((size) => size + 1),
    decreaseFont: () => setFontSize((size) => size - 1),
    themeName,
    setTheme,
    selection,
    renderer,
    copySelection,
    copyAll,
    pasteText,
    pasteClipboard,
    clear,
    reset,
    findNext,
    findPrev,
    scrollToTop,
    scrollToBottom,
    fit,
  }
}
