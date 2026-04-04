import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import RedWorkspace from './pages/RedWorkspace'
import BlueWorkspace from './pages/BlueWorkspace'
import Debrief from './pages/Debrief'

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/session/:sessionId/red" element={<RequireAuth><RedWorkspace /></RequireAuth>} />
        <Route path="/session/:sessionId/blue" element={<RequireAuth><BlueWorkspace /></RequireAuth>} />
        <Route path="/session/:sessionId/debrief" element={<RequireAuth><Debrief /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
