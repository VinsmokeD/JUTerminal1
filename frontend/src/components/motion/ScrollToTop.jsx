import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenisContext } from './SmoothScrollProvider'

/**
 * Resets scroll to the top on every route change.
 * Uses Lenis when available (public/shell routes); falls back to window.scrollTo.
 * Skips in-page hash links so smooth anchor scroll still works.
 *
 * Mount inside SmoothScrollProvider but above <Routes> so it sees the Lenis ref.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const lenisRef = useLenisContext()

  useEffect(() => {
    // Hash links are in-page anchors — Lenis handles them; don't reset.
    if (window.location.hash) return

    if (lenisRef?.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, lenisRef])

  return null
}
