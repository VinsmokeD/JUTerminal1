import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Modal from './Modal'

// 30 minutes of inactivity
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000
// Show warning 2 minutes before logging out
const WARNING_BEFORE_MS = 2 * 60 * 1000

export const SessionActivityContext = createContext({ resetActivity: () => {} })
export const useSessionActivity = () => useContext(SessionActivityContext)

export function SessionManager({ children }) {
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const [showWarning, setShowWarning] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const warningTimerRef = useRef(null)
  const logoutTimerRef = useRef(null)
  const location = useLocation()

  const resetTimers = useCallback(() => {
    if (!token) return

    lastActivityRef.current = Date.now()
    setShowWarning(false)

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
    }, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS)

    logoutTimerRef.current = setTimeout(() => {
      logout()
    }, INACTIVITY_LIMIT_MS)
  }, [token, logout])

  useEffect(() => {
    if (!token) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      setShowWarning(false)
      return
    }

    const handleActivity = () => {
      // Throttle resets to max once per second to reduce CPU usage
      if (Date.now() - lastActivityRef.current > 1000) {
        resetTimers()
      }
    }

    // Bind to common activity events
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('scroll', handleActivity)
    window.addEventListener('session:activity', handleActivity)

    resetTimers()

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('session:activity', handleActivity)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    }
  }, [token, location.pathname, resetTimers]) // Reset timers on navigation too

  return (
    <SessionActivityContext.Provider value={{ resetActivity: resetTimers }}>
      {children}
      {showWarning && (
        <Modal title="Session Expiring Soon" onClose={resetTimers}>
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-cs bg-amber-warn/10 flex items-center justify-center mb-4 border border-amber-warn/20">
              <svg className="w-6 h-6 text-amber-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-txt-primary mb-2 font-display">Inactivity Warning</h3>
            <p className="text-txt-secondary text-sm mb-6">
              Your session will expire in less than 2 minutes due to inactivity. Do you want to stay signed in?
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => logout()} className="btn-v3 btn-v3-subtle">Sign Out Now</button>
              <button onClick={resetTimers} className="btn-v3 btn-v3-blue">Stay Signed In</button>
            </div>
          </div>
        </Modal>
      )}
    </SessionActivityContext.Provider>
  )
}
