import { useEffect, useRef, useState } from 'react'
import { useTerminal } from '../../hooks/useTerminal'
import TerminalContextMenu from './TerminalContextMenu'
import TerminalToolbar from './TerminalToolbar'
import OutputAnnotator from './OutputAnnotator'
import OutputInsightPanel from './OutputInsightPanel'

/**
 * Real PTY terminal component.
 *
 * onData — raw keystrokes sent to backend (every character)
 * onCommand — extracted command string sent on Enter (for AI/discovery)
 */
export default function Terminal({ onData, onCommand, pendingOutput, connectionState = 'connected', sessionId }) {
  const containerRef = useRef(null)
  const touchTimerRef = useRef(null)
  const pinchDistanceRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)
  const [menu, setMenu] = useState(null)
  const [insights, setInsights] = useState([])
  const [activeInsight, setActiveInsight] = useState(null)
  const [autoCopy, setAutoCopy] = useState(() => {
    try {
      return localStorage.getItem('cs.terminal.autoCopy') === 'true'
    } catch {
      return false
    }
  })
  const terminal = useTerminal({ containerRef, onData, onCommand, sessionId, autoCopySelection: autoCopy })

  // Expose writeOutput via ref so parent can push output
  if (pendingOutput) {
    pendingOutput.current = terminal.writeOutput
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      terminal.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [terminal.focus])

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

  const handleAutoCopyChange = (enabled) => {
    setAutoCopy(enabled)
    try {
      localStorage.setItem('cs.terminal.autoCopy', String(enabled))
    } catch {
      // ignore persistence failures
    }
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-cs-sm transition-shadow ${isFocused ? 'ring-1 ring-cs-red/45' : 'ring-1 ring-transparent'}`}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <TerminalToolbar
        fontSize={terminal.fontSize}
        renderer={terminal.renderer}
        selection={terminal.selection}
        autoCopy={autoCopy}
        onAutoCopyChange={handleAutoCopyChange}
        onFontDown={terminal.decreaseFont}
        onFontUp={terminal.increaseFont}
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
        onOpen={() => setActiveInsight((insights.find((item) => item.id === activeInsight) || insights[0])?.id)}
      />
      <div
        ref={containerRef}
        className="min-h-0 flex-1 terminal"
        style={{ padding: '16px', background: 'transparent' }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseDown={() => terminal.focus()}
      />
      <OutputInsightPanel
        insights={insights}
        activeId={activeInsight}
        onSelect={setActiveInsight}
        onDismiss={(id) => {
          setInsights((current) => current.filter((item) => item.id !== id))
          setActiveInsight((current) => current === id ? null : current)
        }}
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
