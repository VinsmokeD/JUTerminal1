import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(username, password)
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 relative overflow-hidden">
        {/* Grid decoration */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(6,182,212,0.4) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">CyberSim</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Learn to attack.<br />
            <span className="text-cyan-400">Learn to defend.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md mb-10">
            A dual-perspective cybersecurity training platform. Execute real attacks in a sandboxed terminal while watching the resulting alerts in a live SIEM — bridging the gap between offensive and defensive security.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { label: 'Red Team', desc: 'Kali terminal + pentest tools', color: 'text-rose-400', bg: 'bg-rose-950/50 border-rose-900/50' },
              { label: 'Blue Team', desc: 'SIEM console + IR playbooks', color: 'text-teal-400', bg: 'bg-teal-950/50 border-teal-900/50' },
              { label: 'AI Tutor', desc: 'Adaptive step-by-step guidance', color: 'text-cyan-400', bg: 'bg-cyan-950/50 border-cyan-900/50' },
              { label: 'Sandboxed', desc: 'Isolated Docker environments', color: 'text-amber-400', bg: 'bg-amber-950/50 border-amber-900/50' },
            ].map((f) => (
              <div key={f.label} className={`rounded-lg border px-3 py-2.5 ${f.bg}`}>
                <div className={`text-sm font-semibold ${f.color}`}>{f.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-xl">CyberSim</div>
              <div className="text-slate-500 text-xs">Cybersecurity Training Platform</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-white font-semibold text-lg mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {mode === 'login' ? 'Sign in to continue your training' : 'Start your cybersecurity journey'}
            </p>

            <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-lg p-1">
              {['login', 'register'].map((m) => (
                <button key={m} onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === m ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                  {m === 'login' ? 'Sign in' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Username</label>
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  required autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
                  placeholder="Enter password"
                />
              </div>

              {error && (
                <div className="text-rose-400 text-xs bg-rose-950/50 border border-rose-800/50 rounded-lg px-3 py-2.5">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-medium text-sm transition-all shadow-lg shadow-cyan-500/10 disabled:shadow-none">
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>
          <p className="text-center text-slate-600 text-xs mt-4">Jordan University of Science & Technology</p>
        </div>
      </div>
    </div>
  )
}
