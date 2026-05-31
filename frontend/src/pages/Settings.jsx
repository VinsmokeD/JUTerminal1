import { useNavigate } from 'react-router-dom'
import ParallaxNav from '../components/nav/ParallaxNav'
import { Button } from '../components/ui'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'

export default function Settings() {
  const navigate = useNavigate()
  const { skillLevel, setSkillLevel } = useAuthStore()
  const {
    terminalTheme, setTerminalTheme,
    terminalFont, setTerminalFont,
    autoCopy, setAutoCopy,
    animations, setAnimations,
    verbosity, setVerbosity,
    perfMode, setPerfMode,
    reset,
  } = useSettingsStore()

  const resetLocalLearningData = () => {
    localStorage.removeItem('cs.workspace.layouts.v1')
    reset()
  }

  return (
    <div className="min-h-dvh bg-void text-txt-primary font-display">
      <ParallaxNav />
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
                  className="w-full h-1.5 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-cs-blue"
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
                  ['experienced', 'Experienced'],
                ]} />
              </SettingRow>
              <SettingRow label="AI verbosity" note="Controls the depth of AI tutor explanations.">
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
              <SettingRow label="Animations" note="Toggle visual transitions and motion effects.">
                <Segmented value={animations} onChange={setAnimations} options={[
                  ['on', 'On'],
                  ['reduced', 'Reduced'],
                ]} />
              </SettingRow>
            </div>
          </section>

          <section className="card-v3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-txt-secondary font-mono">Performance</h2>
            <div className="mt-4 space-y-4">
              <SettingRow
                label="Render quality"
                note={
                  perfMode === 'low'
                    ? 'Low: 3D and blur disabled â€” best for older laptops and projectors.'
                    : perfMode === 'high'
                    ? 'High: all effects enabled regardless of device.'
                    : 'Auto: adapts to device capability and monitors live FPS.'
                }
              >
                <Segmented value={perfMode} onChange={setPerfMode} options={[
                  ['auto', 'Auto'],
                  ['high', 'High'],
                  ['low', 'Low'],
                ]} />
              </SettingRow>
              {perfMode === 'auto' && (
                <p className="text-xs text-txt-dim font-mono">
                  Auto-detected from CPU cores, display density, and pointer type.
                  Switches to Low if the app drops below 38 fps for 2 consecutive seconds.
                </p>
              )}
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
