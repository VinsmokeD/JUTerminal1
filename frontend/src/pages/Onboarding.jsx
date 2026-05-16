import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import useTilt from '../hooks/useTilt'
import { Badge, Button } from '../components/ui'

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
  const [mounted, setMounted] = useState(false)
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

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleContinue = async () => {
    if (!selected) return
    await setSkillLevel(selected)
    await completeOnboarding()
    navigate('/dashboard')
  }

  return (
    <div
      className="min-h-screen bg-void px-6 py-10 flex items-center justify-center"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <div className="w-full max-w-[900px] mx-auto">
        <div className={`mb-8 text-center transition-all duration-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
          <div className="mx-auto mb-4 h-12 w-12 relative">
            <div className="absolute left-0 top-0 h-5 w-5 rounded bg-cs-red shadow-red-glow" />
            <div className="absolute bottom-0 right-0 h-5 w-5 rounded bg-cs-blue shadow-blue-glow" />
          </div>
          <h1 className="text-2xl font-extrabold font-display text-txt-primary">Welcome to CyberSim</h1>
          <p className="mt-2 text-txt-dim text-sm font-mono">Select your experience level to personalize your training</p>
          <div className="mt-4">
            <Badge tone="neutral">Step 1 of 1</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {LEVELS.map((level, index) => {
            const isSelected = selected === level.id
            const bind = tiltByLevel[level.id]
            return (
              <button
                key={level.id}
                ref={bind.ref}
                onMouseMove={bind.onMouseMove}
                onMouseLeave={bind.onMouseLeave}
                onClick={() => setSelected(level.id)}
                style={{ transitionDelay: mounted ? `${160 + index * 80}ms` : '0ms' }}
                className={`card-v3 tilt-target text-left p-5 min-h-[296px] border-2 transition-all duration-300 ${
                  mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                } ${
                  isSelected ? level.selected : 'border-cs-border hover:border-cs-border/60'
                }`}
              >
                {isSelected && (
                  <span className="absolute right-4 top-4 translate-y-0 opacity-100 transition-all duration-200">
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
                      <span className={`h-[3px] w-[3px] rounded-full ${level.dot}`} />
                      <span className="text-xs text-txt-dim font-mono">{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            variant="blue"
            size="lg"
            disabled={!selected}
            onClick={handleContinue}
            className={`w-full max-w-xs ${!selected ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            Begin training →
          </Button>
        </div>
      </div>
    </div>
  )
}
