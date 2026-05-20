import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui'

const TAGLINE = [
  { text: 'Attack.', className: 'text-cs-red', delay: 600 },
  { text: 'Defend.', className: 'text-cs-blue', delay: 800 },
  { text: 'Learn both sides.', className: 'text-txt-dim', delay: 1000 },
]

const FEATURES = [
  { label: 'Red Team', desc: 'Kali terminal + pentest tools', color: 'text-cs-red', border: 'border-cs-red/20 bg-cs-red-surface border-l-cs-red' },
  { label: 'Blue Team', desc: 'SIEM console + IR playbooks', color: 'text-cs-blue', border: 'border-cs-blue/20 bg-cs-blue-surface border-l-cs-blue' },
  { label: 'AI Tutor', desc: 'Adaptive step-by-step guidance', color: 'text-amber-warn', border: 'border-amber-warn/20 bg-surface-2 border-l-amber-warn' },
  { label: 'Sandboxed', desc: 'Isolated Docker environments', color: 'text-green-signal', border: 'border-green-signal/20 bg-surface-2 border-l-green-signal' },
]

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [typedWords, setTypedWords] = useState([])
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const timers = TAGLINE.map((word, index) => (
      setTimeout(() => {
        setTypedWords((current) => (current.includes(index) ? current : [...current, index]))
      }, word.delay)
    ))
    return () => timers.forEach(clearTimeout)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const authResult = mode === 'login'
        ? await login(username, password)
        : await register(username, password)
      navigate(authResult?.role === 'instructor' ? '/instructor' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex">
      <style>{`
        @keyframes authDriftA {
          0%, 100% { transform: translate3d(-4%, -3%, 0) scale(1); }
          50% { transform: translate3d(8%, 6%, 0) scale(1.08); }
        }
        @keyframes authDriftB {
          0%, 100% { transform: translate3d(5%, 5%, 0) scale(1.05); }
          50% { transform: translate3d(-7%, -4%, 0) scale(0.96); }
        }
        @keyframes authLogoPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.72; transform: scale(0.92); }
        }
        @keyframes authType {
          from { width: 0; }
          to { width: calc(var(--chars) * 1ch); }
        }
        .auth-gradient-a { animation: authDriftA 16s ease-in-out infinite; }
        .auth-gradient-b { animation: authDriftB 18s ease-in-out infinite; }
        .auth-logo-pulse-a { animation: authLogoPulse 2.6s ease-in-out infinite; }
        .auth-logo-pulse-b { animation: authLogoPulse 2.6s ease-in-out 220ms infinite; }
        .auth-word { display: inline-block; width: 0; overflow: hidden; white-space: nowrap; vertical-align: bottom; }
        .auth-word.typed { animation: authType 520ms steps(var(--chars)) both; }
        @media (prefers-reduced-motion: reduce) {
          .auth-gradient-a, .auth-gradient-b, .auth-logo-pulse-a, .auth-logo-pulse-b, .auth-word.typed { animation: none; }
          .auth-word { width: auto; }
        }
      `}</style>

      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative overflow-hidden border-r border-cs-border">
        <div className="pointer-events-none absolute -left-24 top-10 h-[420px] w-[420px] rounded-full bg-cs-red/[0.06] blur-3xl auth-gradient-a" />
        <div className="pointer-events-none absolute bottom-8 right-0 h-[480px] w-[480px] rounded-full bg-cs-blue/[0.06] blur-3xl auth-gradient-b" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.8) 0 1px, transparent 1px 4px)' }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="relative h-[52px] w-[52px]">
              <div className="auth-logo-pulse-a absolute left-0 top-0 h-6 w-6 rounded bg-cs-red shadow-red-glow" />
              <div className="auth-logo-pulse-b absolute bottom-0 right-0 h-6 w-6 rounded bg-cs-blue shadow-blue-glow" />
            </div>
            <span className="text-3xl font-extrabold text-txt-primary font-display">CyberSim</span>
          </div>

          <h1 className="text-4xl font-extrabold text-txt-primary mb-4 leading-tight font-display">
            {TAGLINE.map((word, index) => (
              <span key={word.text}>
                <span
                  className={`auth-word ${typedWords.includes(index) ? 'typed' : ''} ${word.className}`}
                  style={{ '--chars': word.text.length }}
                >
                  {word.text}
                </span>
                {index === 1 ? <br /> : ' '}
              </span>
            ))}
          </h1>
          <p className="text-txt-secondary text-lg leading-relaxed max-w-md mb-10">
            A dual-perspective cybersecurity training platform. Execute real attacks in a sandboxed terminal while watching the resulting alerts in a live SIEM.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {FEATURES.map((f) => (
              <div key={f.label} className={`rounded-cs border border-l-2 px-3 py-2.5 transition hover:scale-[1.02] ${f.border}`}>
                <div className={`text-sm font-semibold ${f.color}`}>{f.label}</div>
                <div className="text-xs text-txt-dim mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="relative h-10 w-10">
              <div className="auth-logo-pulse-a absolute left-0 top-0 h-[18px] w-[18px] rounded bg-cs-red shadow-red-glow" />
              <div className="auth-logo-pulse-b absolute bottom-0 right-0 h-[18px] w-[18px] rounded bg-cs-blue shadow-blue-glow" />
            </div>
            <div>
              <div className="text-txt-primary font-bold text-xl font-display">CyberSim</div>
              <div className="text-txt-dim text-xs font-mono">Cybersecurity Training Platform</div>
            </div>
          </div>

          <div className="card-v3 card-v3-spotlight p-6">
            <h2 className="text-txt-primary font-bold text-lg mb-1 font-display">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-txt-dim text-sm mb-6">
              {mode === 'login' ? 'Sign in to continue your training' : 'Start your cybersecurity journey'}
            </p>

            <div className="flex gap-1 mb-6 bg-surface-2 rounded-cs p-1">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 py-2 rounded-cs-sm text-sm font-medium transition-colors duration-300 font-display ${
                    mode === m ? 'bg-surface-4 text-txt-primary shadow-sm' : 'text-txt-dim hover:text-txt-secondary hover:bg-surface-3/40'
                  }`}
                >
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
                  className="input font-mono text-sm focus:ring-2 focus:ring-cs-blue/60 focus:shadow-focus-blue"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="input-label">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input font-mono text-sm focus:ring-2 focus:ring-cs-blue/60 focus:shadow-focus-blue"
                  placeholder="Enter password"
                />
              </div>

              <div className={`transition-all duration-150 ${error ? 'opacity-100 translate-y-0' : 'pointer-events-none -translate-y-1 opacity-0'}`}>
                {error && (
                  <div className="text-cs-red text-xs bg-cs-red-surface border border-cs-red/20 rounded-cs-sm px-3 py-2.5">{error}</div>
                )}
              </div>

              <Button
                type="submit"
                loading={loading}
                variant={mode === 'login' ? 'blue' : 'red'}
                className="w-full"
              >
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </div>
          <p className="text-center text-txt-dim text-xs mt-4 font-mono">University of Jordan</p>
        </div>
      </div>
    </div>
  )
}
