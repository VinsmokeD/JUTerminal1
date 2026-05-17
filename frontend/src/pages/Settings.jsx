import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CyberSimNav from '../components/nav/CyberSimNav'
import { Button } from '../components/ui'
import { useAuthStore } from '../store/authStore'

const readSetting = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

const writeSetting = (key, value) => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // ignore storage failures
  }
}

export default function Settings() {
  const navigate = useNavigate()
  const { skillLevel, setSkillLevel } = useAuthStore()
  const [terminalTheme, setTerminalTheme] = useState(() => readSetting('cs.terminal.theme', 'dark'))
  const [terminalFont, setTerminalFont] = useState(() => Number(readSetting('cs.terminal.font', '12.5')))
  const [autoCopy, setAutoCopy] = useState(() => readSetting('cs.terminal.autoCopy', 'false') === 'true')
  const [animations, setAnimations] = useState(() => readSetting('cs.ui.animations', 'on'))
  const [verbosity, setVerbosity] = useState(() => readSetting('cs.ai.verbosity', 'balanced'))

  useEffect(() => {
    writeSetting('cs.terminal.theme', terminalTheme)
  }, [terminalTheme])

  useEffect(() => {
    writeSetting('cs.terminal.font', Math.min(20, Math.max(10, Number(terminalFont) || 12.5)))
  }, [terminalFont])

  useEffect(() => {
    writeSetting('cs.terminal.autoCopy', autoCopy)
  }, [autoCopy])

  useEffect(() => {
    writeSetting('cs.ui.animations', animations)
    document.documentElement.dataset.animations = animations
  }, [animations])

  useEffect(() => {
    writeSetting('cs.ai.verbosity', verbosity)
  }, [verbosity])

  const resetLocalLearningData = () => {
    ;[
      'cs.workspace.layouts.v1',
      'cs.terminal.font',
      'cs.terminal.theme',
      'cs.terminal.autoCopy',
      'cs.ai.verbosity',
      'cs.ui.animations',
    ].forEach((key) => localStorage.removeItem(key))
    setTerminalTheme('dark')
    setTerminalFont(12.5)
    setAutoCopy(false)
    setAnimations('on')
    setVerbosity('balanced')
  }

  return (
    <div className="min-h-screen bg-void text-txt-primary font-display">
      <CyberSimNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.12em] text-txt-dim">Operator preferences</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Settings</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card-v3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-txt-secondary font-mono">Terminal</h2>
            <div className="mt-4 space-y-4">
              <SettingRow label="Theme" note="Applies to new or remounted terminals.">
                <Segmented value={terminalTheme} onChange={setTerminalTheme} options={[
                  ['dark', 'Dark'],
                  ['contrast', 'Contrast'],
                ]} />
              </SettingRow>
              <SettingRow label="Font size" note={`${Number(terminalFont).toFixed(1)}px`}>
                <input
                  type="range"
                  min="10"
                  max="20"
                  step="0.5"
                  value={terminalFont}
                  onChange={(event) => setTerminalFont(Number(event.target.value))}
                  className="w-full"
                />
              </SettingRow>
              <SettingRow label="Auto-copy selection" note="Copy highlighted terminal text automatically.">
                <Toggle checked={autoCopy} onChange={setAutoCopy} />
              </SettingRow>
            </div>
          </section>

          <section className="card-v3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-txt-secondary font-mono">Learning</h2>
            <div className="mt-4 space-y-4">
              <SettingRow label="Skill level" note="Controls default guidance depth.">
                <Segmented value={skillLevel || 'beginner'} onChange={setSkillLevel} options={[
                  ['beginner', 'Beginner'],
                  ['intermediate', 'Intermediate'],
                  ['advanced', 'Advanced'],
                ]} />
              </SettingRow>
              <SettingRow label="AI verbosity" note="Used by local UI preferences and future tutor requests.">
                <Segmented value={verbosity} onChange={setVerbosity} options={[
                  ['concise', 'Concise'],
                  ['balanced', 'Balanced'],
                  ['detailed', 'Detailed'],
                ]} />
              </SettingRow>
            </div>
          </section>

          <section className="card-v3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-txt-secondary font-mono">Interface</h2>
            <div className="mt-4 space-y-4">
              <SettingRow label="Animations" note="Reduced motion is always respected by the browser media query.">
                <Segmented value={animations} onChange={setAnimations} options={[
                  ['on', 'On'],
                  ['reduced', 'Reduced'],
                ]} />
              </SettingRow>
            </div>
          </section>

          <section className="card-v3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-txt-secondary font-mono">Reset</h2>
            <p className="mt-3 text-sm text-txt-secondary">
              Clears local workspace layouts, terminal preferences, and learning UI preferences for this browser.
            </p>
            <div className="mt-5">
              <Button variant="ghost" size="sm" onClick={resetLocalLearningData}>Reset local preferences</Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function SettingRow({ label, note, children }) {
  return (
    <div className="grid gap-3 border-t border-cs-border/60 pt-4 sm:grid-cols-[180px_1fr]">
      <div>
        <div className="text-sm font-semibold text-txt-primary">{label}</div>
        <div className="mt-1 text-xs text-txt-dim">{note}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex max-w-full flex-wrap gap-1 rounded-cs-sm border border-cs-border bg-surface-2 p-1">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`rounded-cs-sm px-3 py-1.5 text-xs font-mono transition-colors ${
            value === optionValue ? 'bg-cs-blue/15 text-cs-blue' : 'text-txt-dim hover:text-txt-secondary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition-colors ${
        checked ? 'border-cs-blue/50 bg-cs-blue/20' : 'border-cs-border bg-surface-2'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-txt-primary transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
