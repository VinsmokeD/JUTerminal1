import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import useTilt from '../hooks/useTilt'
import useCursorIntent from '../hooks/useCursorIntent'
import { Badge } from '../components/ui'
import { ParallaxMark } from '../components/brand/ParallaxLogo'
import { C } from '../components/brand/primitives'

const LEVELS = [
  {
    id: 'beginner',
    title: 'Beginner',
    subtitle: 'New to cybersecurity',
    description: 'I understand basic IT concepts but have never done hands-on penetration testing or SOC analysis. I want to learn step by step.',
    tone: 'red',
    accentText: 'text-cs-red',
    dot: 'bg-cs-red',
    iconBg: 'bg-cs-red/10',
    accent: C.red,
    selected: 'border-cs-red shadow-[inset_0_0_24px_rgba(255,59,59,0.12)]',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
      </svg>
    ),
    features: ['Step-by-step guidance', 'Concepts explained plainly', 'Guided note templates', 'Reduced hint penalties'],
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    subtitle: 'Some hands-on experience',
    description: "I've used tools like Nmap or Wireshark, maybe done some CTF challenges or security labs. I want to build on what I know.",
    tone: 'blue',
    accentText: 'text-cs-blue',
    dot: 'bg-cs-blue',
    iconBg: 'bg-cs-blue/10',
    accent: C.blue,
    selected: 'border-cs-blue shadow-[inset_0_0_24px_rgba(59,139,255,0.12)]',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
    features: ['Methodology-focused guidance', 'Professional habit coaching', 'Standard hint system', 'Tool technique suggestions'],
  },
  {
    id: 'experienced',
    title: 'Experienced',
    subtitle: 'Comfortable with pentesting',
    description: "I'm comfortable with penetration testing methodology and SIEM analysis. I want a realistic challenge with minimal hand-holding.",
    tone: 'green',
    accentText: 'text-green-signal',
    dot: 'bg-green-signal',
    iconBg: 'bg-green-signal/10',
    accent: C.green,
    selected: 'border-green-signal shadow-[inset_0_0_24px_rgba(0,255,136,0.1)]',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    features: ['Socratic questioning only', 'Minimal UI guidance', 'Higher hint penalties', 'Advanced edge-case focus'],
  },
]

export default function Onboarding() {
  const [selected, setSelected] = useState(null)
  const { setSkillLevel, completeOnboarding } = useAuthStore()
  const navigate = useNavigate()
  const beginnerTilt = useTilt()
  const intermediateTilt = useTilt()
  const experiencedTilt = useTilt()
  const tiltByLevel = {
    beginner: beginnerTilt.bind,
    intermediate: intermediateTilt.bind,
    experienced: experiencedTilt.bind,
  }
  const beginnerCursor = useCursorIntent({ intent: 'inspect', label: 'SELECT', mode: 'red' })
  const intermediateCursor = useCursorIntent({ intent: 'inspect', label: 'SELECT', mode: 'blue' })
  const experiencedCursor = useCursorIntent({ intent: 'inspect', label: 'SELECT', mode: 'neutral' })
  const cursorByLevel = {
    beginner: beginnerCursor.bind,
    intermediate: intermediateCursor.bind,
    experienced: experiencedCursor.bind,
  }
  const continueCursor = useCursorIntent({ intent: 'launch', label: 'INITIALIZE', mode: 'blue' })

  const handleContinue = async () => {
    if (!selected) return
    try {
      await setSkillLevel(selected)
      await completeOnboarding()
      navigate('/dashboard')
    } catch (e) {
      console.error('Onboarding error:', e)
      window.alert('Failed to save selection. Please try again.')
    }
  }

  return (
    <div className="min-h-dvh bg-void px-6 py-10 flex items-center justify-center relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full"
        style={{ background: `radial-gradient(circle, ${C.red}12, transparent 60%)` }} />
      <div className="pointer-events-none absolute -bottom-48 -right-48 w-[800px] h-[800px] rounded-full"
        style={{ background: `radial-gradient(circle, ${C.blue}12, transparent 60%)` }} />
      {/* Ghost grid */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      <div className="w-full max-w-[960px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center"
        >
          <div className="flex justify-center mb-5">
            <ParallaxMark size={52} tone="color" />
          </div>
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-txt-dim mb-3 block">
            // SELECT OPERATOR COGNITIVE PROFILE //
          </span>
          <h1 className="text-3xl font-extrabold font-hud text-txt-primary tracking-tight mb-3">
            Welcome to <span style={{ color: C.red }}>Par</span><span style={{ color: C.blue }}>al</span><span className="text-txt-primary">lax</span>
          </h1>
          <p className="text-txt-secondary text-sm max-w-md mx-auto leading-relaxed">
            Choose the skill level that matches your current experience. You can change this anytime in settings.
          </p>
          <div className="mt-4">
            <Badge tone="neutral">Step 1 of 1</Badge>
          </div>
        </motion.div>

        {/* Level cards */}
        <motion.div
          className="grid gap-4 md:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
          }}
        >
          {LEVELS.map((level) => {
            const isSelected = selected === level.id
            const bind = tiltByLevel[level.id] || {}
            const cBind = cursorByLevel[level.id] || {}
            return (
              <motion.button
                key={level.id}
                ref={bind.ref}
                onMouseMove={bind.onMouseMove}
                onMouseEnter={cBind.onMouseEnter}
                onMouseLeave={() => { bind.onMouseLeave?.(); cBind.onMouseLeave?.() }}
                onClick={() => setSelected(level.id)}
                variants={{
                  hidden: { opacity: 0, y: 28 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                }}
                className={`relative text-left p-5 min-h-[300px] rounded-2xl border-2 transition-all duration-300 tilt-target ${
                  isSelected ? level.selected : 'border-cs-border hover:border-cs-border/60'
                }`}
                style={{
                  background: isSelected
                    ? `linear-gradient(180deg, ${level.accent}0d, transparent), rgba(16,24,43,0.55)`
                    : 'rgba(16,24,43,0.55)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                {isSelected && (
                  <span className="absolute right-4 top-4">
                    <Badge tone={level.tone}>Selected</Badge>
                  </span>
                )}

                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${level.iconBg} ${level.accentText}`}>
                  {level.icon}
                </div>
                <h3 className="text-base font-bold font-display text-txt-primary">{level.title}</h3>
                <p className="mt-1 text-xs text-txt-dim font-mono">{level.subtitle}</p>
                <p className="mt-4 text-xs text-txt-secondary leading-relaxed">{level.description}</p>

                <div className="mt-5 space-y-2">
                  {level.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <span className={`h-[3px] w-[3px] rounded-full flex-shrink-0 ${level.dot}`} />
                      <span className="text-xs text-txt-dim font-mono">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex justify-center"
        >
          <button
            type="button"
            disabled={!selected}
            onClick={handleContinue}
            {...(selected ? continueCursor.bind : {})}
            className={`w-full max-w-xs btn-v3 ${selected ? 'btn-v3-blue' : 'opacity-40 cursor-not-allowed'}`}
          >
            Initialize Neural Link →
          </button>
        </motion.div>
      </div>
    </div>
  )
}
