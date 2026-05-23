import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/**
 * CyberSimNav - Shared navigation bar with dual-square logo
 * Used across all authenticated pages (Dashboard, Debrief, Instructor, etc.)
 *
 * Props:
 *  - showUser: boolean (show username/logout, default true)
 *  - rightContent: ReactNode (custom right-side content)
 */
export default function CyberSimNav({ showUser = true, rightContent }) {
  const { username, logout, skillLevel } = useAuthStore()
  const navigate = useNavigate()

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
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-cs-sm bg-surface-3 flex items-center justify-center text-xs text-cs-blue font-bold font-mono group-hover:bg-cs-blue/10 transition-colors">
                {username?.[0]?.toUpperCase()}
              </div>
              <span className="text-txt-secondary text-sm hidden sm:inline group-hover:text-txt-primary transition-colors">{username}</span>
            </button>
            {skillLevel && (
              <span className={`badge-v3 ${
                skillLevel === 'beginner' ? 'badge-v3-green' : 
                skillLevel === 'intermediate' ? 'badge-v3-amber' : 
                'badge-v3-red'
              }`}>
                {skillLevel}
              </span>
            )}
            <button
              onClick={() => navigate('/settings')}
              className="text-txt-dim hover:text-txt-secondary text-xs transition-colors font-mono"
            >
              [ Settings ]
            </button>
            <button
              onClick={logout}
              className="text-txt-dim hover:text-txt-secondary text-xs transition-colors font-mono"
            >
              [ Sign out ]
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
