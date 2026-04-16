import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'

// Lazy-load heavy components with xterm and complex state
const RedWorkspace = lazy(() => import('./pages/RedWorkspace'))
const BlueWorkspace = lazy(() => import('./pages/BlueWorkspace'))
const Debrief = lazy(() => import('./pages/Debrief'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))

// Loading fallback — dual-square logo + void background
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

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/auth" replace />
}

function RequireOnboarding({ children }) {
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted)
  return onboardingCompleted ? children : <Navigate to="/onboarding" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><RequireOnboarding><Dashboard /></RequireOnboarding></RequireAuth>} />
        <Route
          path="/session/:sessionId/red"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <RedWorkspace />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/session/:sessionId/blue"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <BlueWorkspace />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/session/:sessionId/debrief"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <Debrief />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/instructor"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <InstructorDashboard />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
