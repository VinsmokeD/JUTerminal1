import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribe } from '../../lib/toast'
import { scaleIn } from '../../lib/motion'

const TONE = {
  success:    { border: 'border-green-signal/40',  icon: '✓', cls: 'text-green-signal',  bar: 'bg-green-signal'  },
  error:      { border: 'border-critical/40',      icon: '✕', cls: 'text-critical',      bar: 'bg-critical'      },
  warning:    { border: 'border-amber-warn/40',    icon: '⚠', cls: 'text-amber-warn',    bar: 'bg-amber-warn'    },
  info:       { border: 'border-cs-blue/40',       icon: 'ℹ', cls: 'text-cs-blue',       bar: 'bg-cs-blue'       },
  achievement:{ border: 'border-hud-cyan/40',      icon: '★', cls: 'text-hud-cyan',      bar: 'bg-hud-cyan'      },
  'score-gain':{ border: 'border-green-signal/40', icon: '▲', cls: 'text-green-signal',  bar: 'bg-green-signal'  },
  'score-loss':{ border: 'border-critical/40',     icon: '▼', cls: 'text-critical',      bar: 'bg-critical'      },
}

function ToastItem({ entry, onDone }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const t = setTimeout(onDone, entry.duration)
    return () => clearTimeout(t)
  }, [entry.duration, onDone])

  const isLowPerf = typeof document !== 'undefined' && document.documentElement.dataset.perf === 'low'

  useEffect(() => {
    if (entry.type === 'achievement' && !isLowPerf) {
      const colors = ['#00f3ff', '#ff0055', '#00ff88', '#ffaa00', '#3b8bff', '#ff3b3b']
      const temp = Array.from({ length: 25 }).map((_, idx) => {
        const angle = Math.random() * Math.PI * 2
        const distance = 40 + Math.random() * 80
        const tx = `${Math.cos(angle) * distance}px`
        const ty = `${Math.sin(angle) * distance - 20}px`
        const rot = `${Math.random() * 360}deg`
        const bg = colors[Math.floor(Math.random() * colors.length)]
        const size = 4 + Math.random() * 4
        return {
          id: idx,
          style: {
            '--tx': tx,
            '--ty': ty,
            '--rot': rot,
            backgroundColor: bg,
            width: `${size}px`,
            height: `${size}px`,
            position: 'absolute',
            top: '50%',
            left: '20px',
            animationDelay: `${Math.random() * 150}ms`,
          }
        }
      })
      setParticles(temp)
    }
  }, [entry.type, isLowPerf])

  const tone = TONE[entry.type] || TONE.info

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative flex items-center gap-3 pl-3 pr-4 py-2.5 min-w-[220px] max-w-xs
        bg-surface-2/95 border ${tone.border} rounded-cs
        shadow-xl font-mono text-xs overflow-hidden`}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {particles.map((p) => (
        <span key={p.id} className="confetti-particle" style={p.style} />
      ))}
      <span className={`text-sm flex-shrink-0 ${tone.cls}`}>{tone.icon}</span>
      <span className="text-txt-primary leading-snug flex-1">{entry.message}</span>
      <button
        onClick={onDone}
        className="ml-1 text-txt-dim hover:text-txt-primary transition-colors text-sm leading-none flex-shrink-0"
        aria-label="Dismiss notification"
      >×</button>
      {/* countdown bar */}
      <div
        aria-hidden
        className={`absolute bottom-0 left-0 h-[2px] w-full ${tone.bar} opacity-40 origin-left`}
        style={{ animation: `toast-countdown ${entry.duration}ms linear forwards` }}
      />
    </motion.div>
  )
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribe((entry) => setToasts((p) => [...p, entry]))
  }, [])

  const remove = (id) => setToasts((p) => p.filter((t) => t.id !== id))

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2"
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notifications"
    >
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <ToastItem key={t.id} entry={t} onDone={() => remove(t.id)} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
