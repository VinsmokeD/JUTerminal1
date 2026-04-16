import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import ParticleCanvas from '../components/canvas/ParticleCanvas'

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
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative overflow-hidden">
        {/* Particle canvas background */}
        <ParticleCanvas />

        {/* Ambient glow */}
        <div className="absolute inset-0 z-[1]" style={{
          background: 'radial-gradient(ellipse 70% 50% at 40% 40%, rgba(255,59,59,0.06), transparent), radial-gradient(ellipse 60% 50% at 70% 70%, rgba(59,139,255,0.06), transparent)'
        }} />

        <div className="relative z-10">
          {/* Dual-square logo */}
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="nav-logo-icon" style={{ width: '48px', height: '48px' }}>
              <div className="absolute top-0 left-0 w-5 h-5 rounded bg-cs-red" style={{ boxShadow: '0 0 16px rgba(255,59,59,0.4)' }} />
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded bg-cs-blue" style={{ boxShadow: '0 0 16px rgba(59,139,255,0.4)' }} />
            </div>
            <span className="text-3xl font-extrabold text-txt-primary tracking-tight font-display">CyberSim</span>
          </div>

          <h1 className="text-4xl font-extrabold text-txt-primary mb-4 leading-tight tracking-tighter font-display">
            <span className="text-cs-red">Attack.</span>{' '}
            <span className="text-cs-blue">Defend.</span>
            <br />
            <span className="text-txt-dim">Learn both sides.</span>
          </h1>
          <p className="text-txt-secondary text-lg leading-relaxed max-w-md mb-10">
            A dual-perspective cybersecurity training platform. Execute real attacks in a sandboxed terminal while watching the resulting alerts in a live SIEM — bridging the gap between offensive and defensive security.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { label: 'Red Team', desc: 'Kali terminal + pentest tools', color: 'text-cs-red', border: 'border-cs-red/20 bg-cs-red-surface' },
              { label: 'Blue Team', desc: 'SIEM console + IR playbooks', color: 'text-cs-blue', border: 'border-cs-blue/20 bg-cs-blue-surface' },
              { label: 'AI Tutor', desc: 'Adaptive step-by-step guidance', color: 'text-amber-warn', border: 'border-amber-warn/20 bg-surface-2' },
              { label: 'Sandboxed', desc: 'Isolated Docker environments', color: 'text-green-signal', border: 'border-green-signal/20 bg-surface-2' },
            ].map((f) => (
              <div key={f.label} className={`rounded-cs border px-3 py-2.5 ${f.border}`}>
                <div className={`text-sm font-semibold ${f.color}`}>{f.label}</div>
                <div className="text-xs text-txt-dim mt-0.5">{f.desc}</div>
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
            <div className="nav-logo-icon" style={{ width: '40px', height: '40px' }}>
              <div className="absolute top-0 left-0 w-[18px] h-[18px] rounded bg-cs-red" style={{ boxShadow: '0 0 12px rgba(255,59,59,0.4)' }} />
              <div className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded bg-cs-blue" style={{ boxShadow: '0 0 12px rgba(59,139,255,0.4)' }} />
            </div>
            <div>
              <div className="text-txt-primary font-bold text-xl font-display">CyberSim</div>
              <div className="text-txt-dim text-xs font-mono">Cybersecurity Training Platform</div>
            </div>
          </div>

          <div className="bg-surface-1 border border-cs-border rounded-cs-lg p-6 shadow-xl">
            <h2 className="text-txt-primary font-bold text-lg mb-1 font-display">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-txt-dim text-sm mb-6">
              {mode === 'login' ? 'Sign in to continue your training' : 'Start your cybersecurity journey'}
            </p>

            <div className="flex gap-1 mb-6 bg-surface-2 rounded-cs p-1">
              {['login', 'register'].map((m) => (
                <button key={m} onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 py-2 rounded-cs-sm text-sm font-medium transition-all font-display ${
                    mode === m ? 'bg-surface-4 text-txt-primary shadow-sm' : 'text-txt-dim hover:text-txt-secondary'
                  }`}>
                  {m === 'login' ? 'Sign in' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="input-label">Username</label>
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  required autoFocus
                  className="input font-mono text-sm"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="input-label">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input font-mono text-sm"
                  placeholder="Enter password"
                />
              </div>

              {error && (
                <div className="text-cs-red text-xs bg-cs-red-surface border border-cs-red/20 rounded-cs-sm px-3 py-2.5">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn btn-blue justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>
          <p className="text-center text-txt-dim text-xs mt-4 font-mono">Jordan University of Science & Technology</p>
        </div>
      </div>
    </div>
  )
}
