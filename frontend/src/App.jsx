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

// Loading fallback component — branded CyberSim loading screen
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-slate-950">
      <div className="text-center space-y-4">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600
          flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 animate-pulse">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </div>
        {/* Name */}
        <div>
          <p className="text-white font-semibold">CyberSim</p>
          <p className="text-slate-600 text-xs font-mono-terminal mt-0.5">Loading environment...</p>
        </div>
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce"
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
