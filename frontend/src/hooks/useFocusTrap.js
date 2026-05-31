import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Traps keyboard focus within `containerRef` while `active` is true.
 * Restores focus to the previously focused element on deactivation.
 *
 * @param {React.RefObject} containerRef - ref to the trap boundary element
 * @param {boolean} active - whether the trap is in effect
 */
export default function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active || !containerRef.current) return
    const prevFocused = document.activeElement

    const trap = (e) => {
      if (e.key !== 'Tab') return
      const el = containerRef.current
      if (!el) return
      const focusable = [...el.querySelectorAll(FOCUSABLE)].filter(
        (n) => !n.closest('[hidden]') && window.getComputedStyle(n).display !== 'none',
      )
      if (!focusable.length) { e.preventDefault(); return }
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      // Restore focus — only if the element is still in the DOM
      if (prevFocused && document.contains(prevFocused)) {
        prevFocused.focus()
      }
    }
  }, [active, containerRef])
}
