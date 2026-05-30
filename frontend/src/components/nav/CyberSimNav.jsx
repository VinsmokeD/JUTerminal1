import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'

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
  const { activeSession, fetchActiveSession, lastVisitedRole } = useSessionStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (showUser && username) {
      fetchActiveSession().catch(() => {})
    }
  }, [showUser, username, fetchActiveSession])

  return (
    <nav className="nav-bar">
      {/* Logo */}
      <button onClick={() => navigate(username ? '/dashboard' : '/')} className="flex items-center gap-3 group">
        <div className="nav-logo-icon" />
        <div className="font-display text-lg font-bold text-gradient-nimbus tracking-tight">
          CyberSim<span className="text-txt-dim font-normal">.io</span>
        </div>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {rightContent}

        {activeSession && activeSession.id && !window.location.pathname.startsWith(`/session/${activeSession.id}`) && (
          <button
            onClick={() => navigate(`/session/${activeSession.id}/${lastVisitedRole || activeSession.role}`)}
            className="hidden sm:flex items-center gap-2 btn-v3 btn-v3-sm border-cs-blue/30 text-cs-blue bg-cs-blue/10 hover:bg-cs-blue/20"
          >
            <span className="w-2 h-2 rounded-full bg-cs-blue animate-pulse-soft" />
            <span className="font-display text-xs font-medium">Active Mission</span>
          </button>
        )}

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
