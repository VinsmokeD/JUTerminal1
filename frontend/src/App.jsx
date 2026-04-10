import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import RedWorkspace from './pages/RedWorkspace'
import BlueWorkspace from './pages/BlueWorkspace'
import Debrief from './pages/Debrief'
import InstructorDashboard from './pages/InstructorDashboard'

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
        <Route path="/session/:sessionId/red" element={<RequireAuth><RedWorkspace /></RequireAuth>} />
        <Route path="/session/:sessionId/blue" element={<RequireAuth><BlueWorkspace /></RequireAuth>} />
        <Route path="/session/:sessionId/debrief" element={<RequireAuth><Debrief /></RequireAuth>} />
        <Route path="/instructor" element={<RequireAuth><InstructorDashboard /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
