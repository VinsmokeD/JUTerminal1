import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { modalSlideUp } from '../../lib/motion'

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus into panel on open
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const maxW = { sm: '440px', md: '640px', lg: '880px', xl: '1100px' }[size] || '640px'

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="modal-v3-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          />
          <div className="modal-v3-container">
            <motion.div
              key="panel"
              ref={panelRef}
              className="modal-v3-panel"
              style={{ maxWidth: maxW }}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              variants={modalSlideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
