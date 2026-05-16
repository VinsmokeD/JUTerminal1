import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const maxW = { sm: '440px', md: '640px', lg: '880px', xl: '1100px' }[size] || '640px'

  return createPortal(
    <>
      <div className="modal-v3-scrim" onClick={onClose} />
      <div className="modal-v3-container">
        <div className="modal-v3-panel" style={{ maxWidth: maxW }} role="dialog" aria-modal="true" aria-label={title}>
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-cs-border">
              <div className="font-display text-title-2 text-txt-primary">{title}</div>
              <button
                onClick={onClose}
                className="text-txt-dim hover:text-txt-primary transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}
          <div className="px-6 py-5">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-cs-border bg-surface-1/40">{footer}</div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
