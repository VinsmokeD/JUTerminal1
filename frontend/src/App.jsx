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

// Lazy-load post-auth + heavy pages so the public entry (Landing/Auth) ships lean
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const RedWorkspace = lazy(() => import('./pages/RedWorkspace'))
const BlueWorkspace = lazy(() => import('./pages/BlueWorkspace'))
const Debrief = lazy(() => import('./pages/Debrief'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Profile = lazy(() => import('./pages/Profile'))

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-void">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto relative">
          <div className="absolute top-0 left-0 w-5 h-5 rounded bg-cs-red shadow-red-glow animate-pulse" />
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded bg-cs-blue shadow-blue-glow animate-pulse"
            style={{ animationDelay: '0.5s' }} />
        </div>
        <div>
          <p className="text-txt-primary font-bold font-display">CyberSim</p>
          <p className="text-txt-dim text-xs font-mono mt-0.5">Loading environment...</p>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-cs-blue animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />
          ))}
        </div>
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
  initial: { opacity: 0, scale: 0.97, filter: 'blur(3px)' },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    filter: 'blur(3px)',
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
}

function RoutePage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
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
      <ReticleCursor />
      <SessionManager>
        <ToastContainer />
        <GlobalPalette />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"          element={<RouteGuard allowOnlyUnauth><RoutePage><Landing /></RoutePage></RouteGuard>} />
            <Route path="/auth"      element={<RouteGuard allowOnlyUnauth><RoutePage><Auth /></RoutePage></RouteGuard>} />
            <Route path="/onboarding" element={<RouteGuard requireAuth><RoutePage><ErrorBoundary><Suspense fallback={<LoadingSpinner />}><Onboarding /></Suspense></ErrorBoundary></RoutePage></RouteGuard>} />
            <Route path="/dashboard"  element={<RouteGuard requireAuth requireOnboarding><RoutePage><ErrorBoundary><Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense></ErrorBoundary></RoutePage></RouteGuard>} />
            <Route
              path="/session/:sessionId/red"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <RoutePage>
                      <Suspense fallback={<LoadingSpinner />}><RedWorkspace /></Suspense>
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
                      <Suspense fallback={<LoadingSpinner />}><BlueWorkspace /></Suspense>
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
                      <Suspense fallback={<LoadingSpinner />}><Debrief /></Suspense>
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
                      <Suspense fallback={<LoadingSpinner />}><InstructorDashboard /></Suspense>
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
                      <Suspense fallback={<LoadingSpinner />}><Settings /></Suspense>
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
                      <Suspense fallback={<LoadingSpinner />}><Profile /></Suspense>
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

  if (isChecking) return <LoadingSpinner />

  return (
    <BrowserRouter>
      <BootHandshake>
        <AppContent />
      </BootHandshake>
    </BrowserRouter>
  )
}
