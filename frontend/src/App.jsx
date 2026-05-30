import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
      <SessionManager>
          <ToastContainer />
          <GlobalPalette />
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<RouteGuard allowOnlyUnauth><Landing /></RouteGuard>} />
            <Route path="/auth" element={<RouteGuard allowOnlyUnauth><Auth /></RouteGuard>} />
            <Route path="/onboarding" element={<RouteGuard requireAuth><ErrorBoundary><Onboarding /></ErrorBoundary></RouteGuard>} />
            <Route path="/dashboard" element={<RouteGuard requireAuth requireOnboarding><ErrorBoundary><Dashboard /></ErrorBoundary></RouteGuard>} />
            <Route
              path="/session/:sessionId/red"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                      <RedWorkspace />
                    </Suspense>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/session/:sessionId/blue"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                      <BlueWorkspace />
                    </Suspense>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/session/:sessionId/debrief"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Debrief />
                    </Suspense>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/instructor"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                      <InstructorDashboard />
                    </Suspense>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Settings />
                    </Suspense>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route
              path="/profile"
              element={
                <RouteGuard requireAuth>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Profile />
                    </Suspense>
                  </ErrorBoundary>
                </RouteGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SessionManager>
    </BrowserRouter>
  )
}
