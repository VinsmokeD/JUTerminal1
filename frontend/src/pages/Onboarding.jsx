import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const LEVELS = [
  {
    id: 'beginner',
    title: 'Beginner',
    subtitle: 'New to cybersecurity',
    description: 'I understand basic IT concepts but have never done hands-on penetration testing or SOC analysis. I want to learn step by step.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
      </svg>
    ),
    features: ['Step-by-step guidance', 'Concepts explained in plain English', 'Guided note templates', 'Reduced hint penalties'],
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    subtitle: 'Some hands-on experience',
    description: "I've used tools like Nmap or Wireshark, maybe done some CTF challenges or security labs. I want to build on what I know.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
    features: ['Methodology-focused guidance', 'Professional habit coaching', 'Standard hint system', 'Tools and techniques suggestions'],
  },
  {
    id: 'experienced',
    title: 'Experienced',
    subtitle: 'Comfortable with pentesting',
    description: "I'm comfortable with penetration testing methodology and SIEM analysis. I want a realistic challenge with minimal hand-holding.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

  const handleContinue = async () => {
    if (!selected) return
    await setSkillLevel(selected)
    await completeOnboarding()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Logo & Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">CyberSim</span>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Welcome to CyberSim</h1>
        <p className="text-slate-400 text-sm max-w-md">
          To give you the best learning experience, tell us about your cybersecurity background.
          You can change this anytime in settings.
        </p>
      </div>

      {/* Skill cards */}
      <div className="grid gap-4 w-full max-w-3xl md:grid-cols-3">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => setSelected(level.id)}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
              selected === level.id
                ? 'border-cyan-500 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className={`mb-3 ${selected === level.id ? 'text-cyan-400' : 'text-slate-500'}`}>
              {level.icon}
            </div>
            <h3 className="text-white font-semibold mb-0.5">{level.title}</h3>
            <p className="text-slate-500 text-xs mb-3">{level.subtitle}</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">{level.description}</p>
            <div className="space-y-1.5">
              {level.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs">
                  <div className={`w-1 h-1 rounded-full ${selected === level.id ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                  <span className={selected === level.id ? 'text-cyan-300' : 'text-slate-500'}>{f}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={!selected}
        className="mt-8 px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-cyan-500/20 disabled:shadow-none"
      >
        Continue to training scenarios
      </button>
    </div>
  )
}
