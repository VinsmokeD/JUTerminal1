import { useEffect, useRef, useState } from 'react'

export default function TerminalToolbar({
  fontSize,
  renderer,
  selection,
  autoCopy,
  onAutoCopyChange,
  onFontDown,
  onFontUp,
  onFindNext,
  onFindPrev,
  onClear,
  onCopySelection,
  onCopyAll,
  onPaste,
  onScrollTop,
  onScrollBottom,
  onReset,
  onNewTab,
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const hasSelection = Boolean(selection)

  useEffect(() => {
    const focusFind = () => inputRef.current?.focus()
    window.addEventListener('terminal:focus-find', focusFind)
    return () => window.removeEventListener('terminal:focus-find', focusFind)
  }, [])

  const runFind = (direction) => {
    if (!query.trim()) return
    if (direction === 'prev') onFindPrev?.(query.trim())
    else onFindNext?.(query.trim())
  }

  return (
    <div className="terminal-toolbar" role="toolbar" aria-label="Terminal controls">
      <div className="terminal-toolbar-group">
        <ToolButton label="Smaller font" onClick={onFontDown}>A-</ToolButton>
        <span className="terminal-toolbar-value" title="Terminal font size">{Number(fontSize).toFixed(0)}px</span>
        <ToolButton label="Larger font" onClick={onFontUp}>A+</ToolButton>
      </div>

      <div className="terminal-toolbar-find">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              runFind(event.shiftKey ? 'prev' : 'next')
            }
          }}
          placeholder="Find output"
          aria-label="Find terminal output"
        />
        <ToolButton label="Find previous" onClick={() => runFind('prev')}>Prev</ToolButton>
        <ToolButton label="Find next" onClick={() => runFind('next')}>Next</ToolButton>
      </div>

      <div className="terminal-toolbar-group">
        <ToolButton label="Copy selected text" disabled={!hasSelection} onClick={onCopySelection}>Copy</ToolButton>
        <ToolButton label="Paste clipboard" onClick={onPaste}>Paste</ToolButton>
        <ToolButton label="Copy all scrollback" onClick={onCopyAll}>All</ToolButton>
      </div>

      <div className="terminal-toolbar-group">
        <ToolButton label="Scroll to top" onClick={onScrollTop}>Top</ToolButton>
        <ToolButton label="Scroll to bottom" onClick={onScrollBottom}>Bottom</ToolButton>
        <ToolButton label="Clear terminal viewport" onClick={onClear}>Clear</ToolButton>
        <ToolButton label="Reset terminal state" onClick={onReset}>Reset</ToolButton>
      </div>

      <label className="terminal-toolbar-toggle" title="Copy highlighted terminal text automatically">
        <input
          type="checkbox"
          checked={autoCopy}
          onChange={(event) => onAutoCopyChange?.(event.target.checked)}
        />
        Auto-copy
      </label>

      <div className="terminal-toolbar-spacer" />
      <span className="terminal-renderer" title="Renderer">{renderer}</span>
      <ToolButton label="Open this session in a new browser tab" onClick={onNewTab}>New tab</ToolButton>
    </div>
  )
}

function ToolButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      className="terminal-tool-button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
