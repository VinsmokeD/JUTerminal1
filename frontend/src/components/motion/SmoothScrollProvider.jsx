import { createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import useLenis from '../../hooks/useLenis'

const LenisCtx = createContext(null)

export function useLenisContext() {
  return useContext(LenisCtx)
}

/**
 * SmoothScrollProvider — wraps public / shell routes with Lenis smooth scroll.
 * Hard-disabled inside /session/** (workspace routes) — never hijack terminal scroll.
 */
export default function SmoothScrollProvider({ children }) {
  const { pathname } = useLocation()
  const isWorkspace = pathname.startsWith('/session/')
  const lenisRef = useLenis({ disabled: isWorkspace })

  return <LenisCtx.Provider value={lenisRef}>{children}</LenisCtx.Provider>
}
