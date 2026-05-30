import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import CommandPalette from './components/palette/CommandPalette'
import ToastContainer from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { SessionManager } from './components/ui/SessionManager'

// Lazy-load heavy components with xterm and complex state
const RedWorkspace = lazy(() => import('./pages/RedWorkspace'))
const BlueWorkspace = lazy(() => import('./pages/BlueWorkspace'))
const Debrief = lazy(() => import('./pages/Debrief'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Profile = lazy(() => import('./pages/Profile'))

// Loading fallback - dual-square logo + void background
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-void">
      <div className="text-center space-y-4">
        {/* Dual-square logo */}
        <div className="w-12 h-12 mx-auto relative">
          <div className="absolute top-0 left-0 w-5 h-5 rounded bg-cs-red shadow-red-glow animate-pulse" />
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded bg-cs-blue shadow-blue-glow animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        {/* Name */}
        <div>
          <p className="text-txt-primary font-bold font-display">CyberSim</p>
          <p className="text-txt-dim text-xs font-mono mt-0.5">Loading environment...</p>
        </div>
        {/* Progress dots */}
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
    if (!token) {
      return <Navigate to="/auth" state={{ from: location }} replace />
    }
    if (requireOnboarding && !onboardingCompleted) {
      return <Navigate to="/onboarding" replace />
    }
  }

  return children
}

function GlobalPalette() {
  // Hide palette on auth screen - no point launching commands before login
  const loc = useLocation()
  if (loc.pathname.startsWith('/auth')) return null
  return <CommandPalette />
}

function RouteScannerWipe() {
  return (
    <motion.div
      initial={{ left: '-10vw', opacity: 0 }}
      animate={{ 
        left: ['-10vw', '110vw'],
        opacity: [0, 1, 1, 0]
      }}
      transition={{ 
        duration: 0.65, 
        ease: 'easeInOut' 
      }}
      className="fixed top-0 bottom-0 w-[6px] z-[9999] pointer-events-none bg-gradient-to-b from-[#4CC2FF] via-[#9B7DFF] to-transparent shadow-[0_0_25px_#4CC2FF,0_0_50px_#9B7DFF]"
    />
  )
}

const pageTransitionVariants = {
  initial: {
    opacity: 0,
    scale: 0.97,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.34, 1.56, 0.64, 1],
    }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    filter: 'blur(4px)',
    transition: {
      duration: 0.25,
      ease: 'easeIn',
    }
  }
}

function RoutePage({ children }) {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full min-h-dvh flex flex-col origin-center"
    >
      <RouteScannerWipe />
      {children}
    </motion.div>
  )
}

function AppContent() {
  const location = useLocation()

  return (
    <SessionManager>
      <ToastContainer />
      <GlobalPalette />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public landing page */}
          <Route path="/" element={<RouteGuard allowOnlyUnauth><RoutePage><Landing /></RoutePage></RouteGuard>} />
          <Route path="/auth" element={<RouteGuard allowOnlyUnauth><RoutePage><Auth /></RoutePage></RouteGuard>} />
          <Route path="/onboarding" element={<RouteGuard requireAuth><RoutePage><ErrorBoundary><Onboarding /></ErrorBoundary></RoutePage></RouteGuard>} />
          <Route path="/dashboard" element={<RouteGuard requireAuth requireOnboarding><RoutePage><ErrorBoundary><Dashboard /></ErrorBoundary></RoutePage></RouteGuard>} />
          <Route
            path="/session/:sessionId/red"
            element={
              <RouteGuard requireAuth>
                <ErrorBoundary>
                  <RoutePage>
                    <Suspense fallback={<LoadingSpinner />}>
                      <RedWorkspace />
                    </Suspense>
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <BlueWorkspace />
                    </Suspense>
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <Debrief />
                    </Suspense>
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <InstructorDashboard />
                    </Suspense>
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <Settings />
                    </Suspense>
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <Profile />
                    </Suspense>
                  </RoutePage>
                </ErrorBoundary>
              </RouteGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </SessionManager>
  )
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkAuth().finally(() => setIsChecking(false))
  }, [checkAuth])

  if (isChecking) {
    return <LoadingSpinner />
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

