import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import CommandPalette from './components/palette/CommandPalette'
import ToastContainer from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { SessionManager } from './components/ui/SessionManager'
import SmoothScrollProvider from './components/motion/SmoothScrollProvider'
import ReticleCursor from './components/motion/ReticleCursor'
import BootHandshake from './components/shell/BootHandshake'
import CurtainTransition from './components/motion/CurtainTransition'
import ScrollToTop from './components/motion/ScrollToTop'

// Lazy-load post-auth + heavy pages so the public entry (Landing/Auth) ships lean
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const RedWorkspace = lazy(() => import('./pages/RedWorkspace'))
const BlueWorkspace = lazy(() => import('./pages/BlueWorkspace'))
const Debrief = lazy(() => import('./pages/Debrief'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Profile = lazy(() => import('./pages/Profile'))

// Matches the BootHandshake logo so auth-check and boot sequence are one
// continuous visual rather than two different spinners.
function BootLogo() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void">
      <div className="flex items-center gap-3 select-none">
        <img src="/brand/parallax-icon.svg" alt="" aria-hidden="true" className="w-8 h-8 flex-shrink-0" />
        <span className="font-display font-bold text-txt-primary tracking-[0.15em] text-sm">PARALLAX</span>
      </div>
    </div>
  )
}

function RouteGuard({ children, requireAuth = true, requireOnboarding = false, allowOnlyUnauth = false }) {
  const token = useAuthStore((s) => s.token)
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted)
  const location = useLocation()

  if (allowOnlyUnauth) {
    if (token) {
      const from = location.state?.from?.pathname || '/dashboard'
      return <Navigate to={from} replace />
    }
    return children
  }

  if (requireAuth) {
    if (!token) return <Navigate to="/auth" state={{ from: location }} replace />
    if (requireOnboarding && !onboardingCompleted) return <Navigate to="/onboarding" replace />
  }

  return children
}

function GlobalPalette() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/auth')) return null
  return <CommandPalette />
}

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(4px)',
    transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
  },
}

function RoutePage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ willChange: 'opacity, transform' }}
      className="w-full min-h-dvh flex flex-col origin-center"
    >
      <CurtainTransition />
      {children}
    </motion.div>
  )
}

function AppContent() {
  const location = useLocation()

  return (
    <SmoothScrollProvider>
      <ScrollToTop />
      <ReticleCursor />
      <SessionManager>
        <ToastContainer />
        <GlobalPalette />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"          element={<RouteGuard allowOnlyUnauth><RoutePage><Landing /></RoutePage></RouteGuard>} />
            <Route path="/auth"      element={<RouteGuard allowOnlyUnauth><RoutePage><Auth /></RoutePage></RouteGuard>} />
            <Route path="/onboarding" element={<RouteGuard requireAuth><RoutePage><ErrorBoundary><Suspense fallback={<BootLogo />}><Onboarding /></Suspense></ErrorBoundary></RoutePage></RouteGuard>} />
            <Route path="/dashboard"  element={<RouteGuard requireAuth requireOnboarding><RoutePage><ErrorBoundary><Suspense fallback={<BootLogo />}><Dashboard /></Suspense></ErrorBoundary></RoutePage></RouteGuard>} />
            <Route
              path="/session/:sessionId/red"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <RoutePage>
                      <Suspense fallback={<BootLogo />}><RedWorkspace /></Suspense>
                    </RoutePage>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/session/:sessionId/blue"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <RoutePage>
                      <Suspense fallback={<BootLogo />}><BlueWorkspace /></Suspense>
                    </RoutePage>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/session/:sessionId/debrief"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <RoutePage>
                      <Suspense fallback={<BootLogo />}><Debrief /></Suspense>
                    </RoutePage>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/instructor"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <RoutePage>
                      <Suspense fallback={<BootLogo />}><InstructorDashboard /></Suspense>
                    </RoutePage>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <RoutePage>
                      <Suspense fallback={<BootLogo />}><Settings /></Suspense>
                    </RoutePage>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/profile"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <RoutePage>
                      <Suspense fallback={<BootLogo />}><Profile /></Suspense>
                    </RoutePage>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </SessionManager>
    </SmoothScrollProvider>
  )
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkAuth().finally(() => setIsChecking(false))
  }, [checkAuth])

  if (isChecking) return <BootLogo />

  return (
    <BrowserRouter>
      <BootHandshake>
        <AppContent />
      </BootHandshake>
    </BrowserRouter>
  )
}
