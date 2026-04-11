import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'

// Lazy-load heavy components with xterm and complex state
const RedWorkspace = lazy(() => import('./pages/RedWorkspace'))
const BlueWorkspace = lazy(() => import('./pages/BlueWorkspace'))
const Debrief = lazy(() => import('./pages/Debrief'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))

// Loading fallback component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-slate-900">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading...</p>
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
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><RequireOnboarding><Dashboard /></RequireOnboarding></RequireAuth>} />
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
