import { useEffect, useRef, useState } from 'react'
import { useTerminal } from '../../hooks/useTerminal'
import { useSettingsStore } from '../../store/settingsStore'
import { useSessionStore } from '../../store/sessionStore'
import { useSessionActivity } from '../ui/SessionManager'
import TerminalContextMenu from './TerminalContextMenu'
import TerminalToolbar from './TerminalToolbar'
import OutputAnnotator from './OutputAnnotator'

/**
 * Real PTY terminal component.
 *
 * onData — raw keystrokes sent to backend (every character)
 * onCommand — extracted command string sent on Enter (for AI/discovery)
 */
export default function Terminal({ onData, onCommand, pendingOutput, connectionState = 'connected', sessionId }) {
  const { resetActivity } = useSessionActivity()
  const containerRef = useRef(null)
  const touchTimerRef = useRef(null)
  const pinchDistanceRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)
  const [menu, setMenu] = useState(null)
  const [insights, setInsights] = useState([])
  const [activeInsight, setActiveInsight] = useState(null)
  const [flagCandidates, setFlagCandidates] = useState([])

  const currentSession = useSessionStore((state) => state.currentSession)
  const role = currentSession?.role || 'red'
  const isRed = role === 'red'

  const {
    terminalTheme, terminalFont, autoCopy,
    setTerminalFont, setAutoCopy
  } = useSettingsStore()

  const inputDisabled = connectionState === 'failed'
  const terminal = useTerminal({
    containerRef, onData, onCommand, sessionId,
    autoCopySelection: autoCopy,
    inputDisabled,
    initialFontSize: terminalFont,
    initialTheme: terminalTheme,
  })
  const focusTerminal = terminal.focus

  // Sync store updates back to terminal hook
  useEffect(() => {
    terminal.setFontSize(terminalFont)
  }, [terminalFont, terminal])

  useEffect(() => {
    terminal.setTheme(terminalTheme)
  }, [terminalTheme, terminal])

  // Reset inactivity timer on terminal activity
  useEffect(() => {
    const term = terminal.termRef.current
    if (!term) return
    const lastActivity = { current: Date.now() }
    const disposable = term.onData(() => {
      if (Date.now() - lastActivity.current > 1000) {
        resetActivity()
        lastActivity.current = Date.now()
      }
    })
    return () => disposable.dispose()
  }, [terminal.termRef, resetActivity])

  // Expose writeOutput via ref so parent can push output
  if (pendingOutput) {
    pendingOutput.current = terminal.writeOutput
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      focusTerminal()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [focusTerminal])

  useEffect(() => {
    const handler = (evt) => {
      if (evt.detail?.sessionId && evt.detail.sessionId !== sessionId) return
      setInsights((current) => {
        const next = [evt.detail, ...current.filter((item) => item.id !== evt.detail.id)].slice(0, 6)
        setActiveInsight(evt.detail.id)
        return next
      })
    }
    window.addEventListener('terminal:insight', handler)
    return () => window.removeEventListener('terminal:insight', handler)
  }, [sessionId])

  useEffect(() => {
    const handler = (evt) => {
      if (evt.detail?.sessionId && evt.detail.sessionId !== sessionId) return
      const { flag_id, description, matched_text, points, already_captured } = evt.detail || {}
      if (!flag_id || already_captured) return
      setFlagCandidates((prev) => {
        if (prev.some((c) => c.flag_id === flag_id)) return prev
        return [...prev, { flag_id, description, matched_text, points }]
      })
    }
    window.addEventListener('terminal:flag_candidate', handler)
    return () => window.removeEventListener('terminal:flag_candidate', handler)
  }, [sessionId])

  useEffect(() => {
    const forThisSession = (evt) => !evt.detail?.sessionId || evt.detail.sessionId === sessionId
    const onClear = (evt) => { if (forThisSession(evt)) terminal.clear() }
    const onCopyAll = (evt) => { if (forThisSession(evt)) terminal.copyAll() }
    const onNewTab = (evt) => {
      if (forThisSession(evt)) window.open(window.location.href, '_blank', 'noopener,noreferrer')
    }
    const onInsert = (evt) => {
      if (!forThisSession(evt)) return
      terminal.pasteText(evt.detail?.data || '')
    }
    window.addEventListener('terminal:clear', onClear)
    window.addEventListener('terminal:copy-all', onCopyAll)
    window.addEventListener('terminal:new-tab', onNewTab)
    window.addEventListener('terminal:insert', onInsert)
    return () => {
      window.removeEventListener('terminal:clear', onClear)
      window.removeEventListener('terminal:copy-all', onCopyAll)
      window.removeEventListener('terminal:new-tab', onNewTab)
      window.removeEventListener('terminal:insert', onInsert)
    }
  }, [sessionId, terminal])

  const handleKeyDown = (evt) => {
    if (evt.ctrlKey && evt.shiftKey && evt.key.toLowerCase() === 'c') {
      evt.preventDefault()
      terminal.copySelection()
      return
    }
    if (evt.ctrlKey && evt.shiftKey && evt.key.toLowerCase() === 'v') {
      evt.preventDefault()
      terminal.pasteClipboard()
      return
    }
    if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'f') {
      evt.preventDefault()
      setMenu(null)
      window.dispatchEvent(new CustomEvent('terminal:focus-find'))
    }
  }

  const statusLabel = {
    connected: 'Live Kali PTY',
    connecting: 'Connecting terminal...',
    disconnected: 'Reconnecting; input queued',
    unauthorized: 'Terminal auth failed',
    failed: 'Connection failed',
  }[connectionState] || 'Terminal offline'
  const statusTone = connectionState === 'connected' ? 'border-green-signal/40 text-green-signal' : 'border-cs-red/40 text-cs-red'

  const showMenu = (x, y) => {
    setMenu({ x: Math.min(x, window.innerWidth - 180), y: Math.min(y, window.innerHeight - 210) })
  }

  const handleContextMenu = (evt) => {
    evt.preventDefault()
    showMenu(evt.clientX, evt.clientY)
  }

  const handleTouchStart = (evt) => {
    terminal.focus()
    if (evt.touches.length === 2) {
      pinchDistanceRef.current = getTouchDistance(evt.touches)
      return
    }
    window.clearTimeout(touchTimerRef.current)
    const touch = evt.touches[0]
    touchTimerRef.current = window.setTimeout(() => {
      showMenu(touch.clientX, touch.clientY)
    }, 560)
  }

  const handleTouchMove = (evt) => {
    if (evt.touches.length === 2 && pinchDistanceRef.current) {
      const next = getTouchDistance(evt.touches)
      const delta = next - pinchDistanceRef.current
      if (Math.abs(delta) > 24) {
        if (delta > 0) terminal.increaseFont()
        else terminal.decreaseFont()
        pinchDistanceRef.current = next
      }
      return
    }
    window.clearTimeout(touchTimerRef.current)
  }

  const handleTouchEnd = () => {
    window.clearTimeout(touchTimerRef.current)
    pinchDistanceRef.current = null
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col clip-chamfer-sm transition-all duration-300 border ${
        isFocused 
          ? `${isRed ? 'border-hud-crimson/50 shadow-[0_0_15px_rgba(255,0,85,0.15)] bg-[#030508]/60' : 'border-hud-cyan/50 shadow-[0_0_15px_rgba(0,243,255,0.15)] bg-[#030508]/60'}` 
          : 'border-cs-border bg-[#030508]/40'
      }`}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Traffic-dot titlebar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-cs-border/40 bg-surface-1/60 shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cs-red/60" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-warn/60" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-green-signal/60" aria-hidden />
        </div>
        <span className="font-mono text-[10px] text-txt-dim ml-2">
          student@kali:~<span className="term-cursor text-green-signal">_</span>
        </span>
      </div>

      <TerminalToolbar
        fontSize={terminal.fontSize}
        renderer={terminal.renderer}
        selection={terminal.selection}
        autoCopy={autoCopy}
        onAutoCopyChange={setAutoCopy}
        onFontDown={() => setTerminalFont(terminal.fontSize - 1)}
        onFontUp={() => setTerminalFont(terminal.fontSize + 1)}
        onFindNext={terminal.findNext}
        onFindPrev={terminal.findPrev}
        onClear={terminal.clear}
        onCopySelection={terminal.copySelection}
        onCopyAll={terminal.copyAll}
        onPaste={terminal.pasteClipboard}
        onScrollTop={terminal.scrollToTop}
        onScrollBottom={terminal.scrollToBottom}
        onReset={terminal.reset}
        onNewTab={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
      />
      <OutputAnnotator
        insight={insights.find((item) => item.id === activeInsight) || insights[0]}
        onDismiss={() => {
          const active = insights.find((item) => item.id === activeInsight) || insights[0]
          if (!active) return
          setInsights((current) => current.filter((item) => item.id !== active.id))
          setActiveInsight((current) => current === active.id ? null : current)
        }}
      />
      {flagCandidates.length > 0 && (
        <div className="flex flex-col gap-1 px-2 py-1">
          {flagCandidates.map((c) => (
            <div
              key={c.flag_id}
              className="flex items-center gap-2 bg-amber-warn/10 border border-amber-warn/40 rounded-cs px-3 py-1.5 text-[11px] font-mono animate-pulse-once"
              role="alert"
              aria-live="polite"
            >
              <span className="text-amber-warn shrink-0">🚩</span>
              <span className="text-amber-warn font-semibold shrink-0">Flag detected</span>
              <span className="text-txt-secondary truncate flex-1">{c.description || c.flag_id}</span>
              {c.points > 0 && (
                <span className="text-green-signal shrink-0">+{c.points} pts</span>
              )}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('flag:prefill', { detail: { value: c.matched_text } }))
                  setFlagCandidates((prev) => prev.filter((x) => x.flag_id !== c.flag_id))
                }}
                className="shrink-0 px-2 py-0.5 bg-amber-warn/20 hover:bg-amber-warn/30 border border-amber-warn/50 rounded-cs-sm text-amber-warn font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-warn"
              >
                Capture
              </button>
              <button
                type="button"
                onClick={() => setFlagCandidates((prev) => prev.filter((x) => x.flag_id !== c.flag_id))}
                className="shrink-0 text-txt-dim hover:text-txt-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cs-border rounded-cs-sm"
                aria-label="Dismiss flag nudge"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 terminal"
        style={{
          padding: '16px',
          background: 'transparent',
          boxShadow: isRed
            ? 'inset 0 0 80px rgba(255,0,85,0.025)'
            : 'inset 0 0 80px rgba(0,243,255,0.02)',
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseDown={() => terminal.focus()}
      />
      <div className={`pointer-events-none absolute right-3 top-3 z-30 rounded-cs-sm border bg-surface-1/90 px-2.5 py-1 text-[10px] font-mono uppercase ${statusTone}`}>
        {statusLabel}
      </div>
      <TerminalContextMenu
        menu={menu}
        selection={terminal.selection}
        onClose={() => setMenu(null)}
        onCopy={terminal.copySelection}
        onPaste={terminal.pasteClipboard}
        onClear={terminal.clear}
        onFind={() => window.dispatchEvent(new CustomEvent('terminal:focus-find'))}
        onReset={terminal.reset}
      />
    </div>
  )
}

function getTouchDistance(touches) {
  const [a, b] = touches
  if (!a || !b) return 0
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}
