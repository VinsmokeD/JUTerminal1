import { useEffect } from 'react'

export default function TerminalContextMenu({ menu, selection, onClose, onCopy, onPaste, onClear, onFind, onReset }) {
  useEffect(() => {
    if (!menu) return undefined
    const close = () => onClose?.()
    const onKey = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu, onClose])

  if (!menu) return null

  const items = [
    { label: 'Copy selection', disabled: !selection, action: onCopy },
    { label: 'Paste', action: onPaste },
    { label: 'Find in output', action: onFind },
    { label: 'Clear viewport', action: onClear },
    { label: 'Reset terminal', action: onReset },
  ]

  return (
    <div
      className="terminal-context-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      aria-label="Terminal context menu"
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.action?.()
            onClose?.()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
