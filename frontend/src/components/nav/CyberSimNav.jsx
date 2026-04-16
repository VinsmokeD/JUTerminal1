import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/**
 * CyberSimNav — Shared navigation bar with dual-square logo
 * Used across all authenticated pages (Dashboard, Debrief, Instructor, etc.)
 *
 * Props:
 *  - showUser: boolean (show username/logout, default true)
 *  - rightContent: ReactNode (custom right-side content)
 */
export default function CyberSimNav({ showUser = true, rightContent }) {
  const { username, logout, skillLevel } = useAuthStore()
  const navigate = useNavigate()

  const skillColors = {
    beginner: 'text-green-signal border-green-signal/30 bg-green-signal/5',
    intermediate: 'text-amber-warn border-amber-warn/30 bg-amber-warn/5',
    advanced: 'text-cs-red border-cs-red/30 bg-cs-red/5',
  }

  return (
    <nav className="nav-bar">
      {/* Logo */}
      <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
        <div className="nav-logo-icon" />
        <div className="font-mono text-lg font-bold text-txt-primary tracking-tight">
          CyberSim<span className="text-txt-dim font-normal">.io</span>
        </div>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {rightContent}

        {showUser && username && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs text-cs-blue font-bold font-mono">
                {username?.[0]?.toUpperCase()}
              </div>
              <span className="text-txt-secondary text-sm hidden sm:inline">{username}</span>
            </div>
            {skillLevel && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${skillColors[skillLevel] || ''}`}>
                {skillLevel}
              </span>
            )}
            <button
              onClick={logout}
              className="text-txt-dim hover:text-txt-secondary text-sm transition-colors font-mono"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
