import { Suspense, lazy } from 'react'
import ParticleCanvas from '../components/canvas/ParticleCanvas'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePerfTier } from '../components/ui/PerfTier'

// three.js hero is lazy-loaded so workspace bundles never pay the cost
const HeroScene3D = lazy(() => import('../components/canvas/HeroScene3D'))

/**
 * Landing - Public landing page with hero, live demo, scenarios, stats, CTA.
 * Renders the full SOC-aesthetic marketing page.
 * Unauthenticated users see this; authenticated users can still access it.
 */
export default function Landing() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const tier = usePerfTier()

  const goToPlatform = () => {
    navigate(token ? '/dashboard' : '/auth')
  }

  return (
    <div className="min-h-dvh bg-void text-txt-primary font-display">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-void/80 border-b border-cs-border backdrop-blur-md font-mono text-xs">
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <div className="w-5 h-5 relative flex items-center justify-center">
            <span className="absolute inset-0 border border-[#00f3ff] animate-pulse" />
            <span className="w-2.5 h-2.5 bg-[#ff0055]" />
          </div>
          <div className="text-sm font-bold text-txt-primary tracking-widest uppercase">
            CyberSim<span className="text-txt-dim font-normal">.io</span>
          </div>
        </button>
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          <li><a href="#scenarios" className="text-txt-secondary hover:text-txt-primary transition-colors tracking-wider uppercase">Scenarios</a></li>
          <li><a href="#how" className="text-txt-secondary hover:text-txt-primary transition-colors tracking-wider uppercase">How It Works</a></li>
          <li><a href="#frameworks" className="text-txt-secondary hover:text-txt-primary transition-colors tracking-wider uppercase">Frameworks</a></li>
          <li>
            <button onClick={goToPlatform} className="btn-v3 btn-v3-blue btn-v3-sm">
              Launch Platform
            </button>
          </li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12 pt-32 pb-20 overflow-hidden">
        {tier >= 1 ? (
          <Suspense fallback={<ParticleCanvas />}>
            <HeroScene3D />
          </Suspense>
        ) : (
          <ParticleCanvas />
        )}
        <div className="relative z-10 text-center w-full max-w-[900px] hud-corner-ticks border border-cs-border/30 bg-void/60 backdrop-blur-md p-6 sm:p-10 md:p-16 rounded-cs shadow-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-cs-border/60 rounded-cs font-mono text-[10px] text-txt-secondary mb-8 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-green-signal animate-pulse shadow-green-glow" />
            Platform Online - 3 Scenarios Active
          </div>

          {/* Title */}
          <h1 className="text-[1.75rem] sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tighter mb-6 font-display">
            <span className="glitch-text text-cs-red" data-text="ATTACK.">ATTACK.</span>{' '}
            <span className="glitch-text text-cs-blue" data-text="DEFEND.">DEFEND.</span>
            <br />
            <span className="text-txt-dim tracking-tight">SIMULTANEOUSLY.</span>
          </h1>

          {/* Sub */}
          <p className="text-sm md:text-base text-txt-secondary leading-relaxed max-w-[580px] mx-auto mb-10 font-mono uppercase tracking-wide opacity-80">
            The first training platform where every attacker command triggers real-time
            SIEM alerts on the defender's screen. Learn both sides of cybersecurity
            in one environment.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goToPlatform} className="btn-v3 btn-v3-red text-xs">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="mr-1"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Start Red Team
            </button>
            <button onClick={goToPlatform} className="btn-v3 btn-v3-blue text-xs">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="mr-1"><path d="M2 8a6 6 0 1112 0A6 6 0 012 8z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Start Blue Team
            </button>
            <a href="#how" className="btn-v3 btn-v3-subtle text-xs">Learn More</a>
          </div>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section className="relative px-6 md:px-12 pb-24 z-10">
        <div className="max-w-[1200px] mx-auto card-v3 card-v3-spotlight p-0 border border-cs-border overflow-hidden bg-[#040609]">
          {/* Window bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-surface-2/80 border-b border-cs-border font-mono text-[10px]">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-critical shadow-red-glow" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-warn" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-signal" />
            </div>
            <div className="text-txt-dim tracking-wider uppercase">CYBERSIM COMMAND CENTER // SESSION: ACTIVE</div>
            <div className="flex gap-1.5">
              <span className="px-2 py-0.5 rounded-cs-sm font-mono text-[9px] font-bold text-cs-red bg-cs-red/10 border border-cs-red/20">RED TEAM</span>
              <span className="px-2 py-0.5 rounded-cs-sm font-mono text-[9px] font-bold text-cs-blue bg-cs-blue/10 border border-cs-blue/20">BLUE TEAM</span>
            </div>
          </div>

          {/* Dual pane */}
          <div className="grid md:grid-cols-2 min-h-[420px]">
            {/* RED - Terminal */}
            <div className="relative border-r border-cs-border overflow-hidden bg-void/60">
              <div className="absolute inset-0 bg-cs-red/[0.01]" />
              <div className="flex items-center justify-between px-4 py-2 border-b border-cs-border bg-surface-1/40 font-mono text-[9px] text-cs-red tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-red animate-pulse" />
                  KALI TERMINAL - ENFORCED METHODOLOGY GATES
                </div>
                <div>METHODOLOGY: PTES</div>
              </div>
              <div className="p-4 font-mono text-xs leading-[1.8] text-txt-secondary">
                <div><span className="text-cs-red">student@kali:~$ </span><span className="text-txt-primary">nmap -sV -p 80,443,3306 172.20.1.20</span></div>
                <div className="text-txt-dim">Starting Nmap 7.94 ( https://nmap.org )</div>
                <div className="text-txt-dim">PORT     STATE SERVICE VERSION</div>
                <div className="text-green-signal">80/tcp   open  http    Apache httpd 2.4.49 (NovaMed Web Portal)</div>
                <div className="text-green-signal">443/tcp  open  ssl     OpenSSL 1.1.1</div>
                <div className="text-green-signal">3306/tcp open  mysql   MySQL 5.7.38 (Patient DB)</div>
                <div>&nbsp;</div>
                <div><span className="text-cs-red">student@kali:~$ </span><span className="text-txt-primary">gobuster dir -u http://172.20.1.20 -w /usr/share/wordlists/common.txt</span></div>
                <div className="text-amber-warn">/backup/              (Status: 200) [Size: 3842] (Directory Listing Enabled)</div>
                <div><span className="text-cs-red">student@kali:~$ </span><span className="inline-block w-1.5 h-3 bg-cs-red animate-pulse" /></div>
              </div>
            </div>

            {/* BLUE - SIEM */}
            <div className="relative overflow-hidden bg-void/60">
              <div className="absolute inset-0 bg-cs-blue/[0.01]" />
              <div className="flex items-center justify-between px-4 py-2 border-b border-cs-border bg-surface-1/40 font-mono text-[9px] text-cs-blue tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-blue animate-pulse" />
                  SURICATA / EVENT METADATA PARSER
                </div>
                <div className="flex items-center gap-1.5"><span className="radar-scanner inline-block" /> TELEMETRY STREAM</div>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { time: '14:03:44', sev: 'sev-med', sevLabel: 'MED', msg: 'Port scan detected - SYN packets to 1024+ ports from 172.20.1.100', mitre: 'T1046' },
                  { time: '14:03:52', sev: 'sev-info', sevLabel: 'INFO', msg: 'Service version probe - nmap fingerprinting on Apache', mitre: 'T1046' },
                  { time: '14:04:01', sev: 'sev-info', sevLabel: 'INFO', msg: 'Routine health check - GET /api/health from 172.20.1.5 [noise]', noise: true },
                  { time: '14:06:11', sev: 'sev-med', sevLabel: 'MED', msg: 'Directory brute-force - 400+ 404 responses in 30s from single source', mitre: 'T1083' },
                  { time: '14:06:44', sev: 'sev-high', sevLabel: 'HIGH', msg: 'Sensitive path probed - /backup/ returned 200 (directory listing enabled)', mitre: 'T1083' },
                ].map((ev, i) => (
                  <div key={i} className={`flex items-center gap-3 p-1.5 font-mono text-[10px] rounded-cs border border-transparent ${
                    ev.noise ? 'opacity-40 hover:opacity-75' : 'bg-surface-2/40 border-cs-border/40 hover:border-cs-border'
                  } transition-all`}>
                    <span className="text-txt-dim">{ev.time}</span>
                    <span className={`px-1.5 py-0.5 rounded-cs-sm font-bold text-[8px] tracking-wide ${
                      ev.sevLabel === 'HIGH' ? 'bg-critical/10 text-critical border border-critical/20' :
                      ev.sevLabel === 'MED' ? 'bg-amber-warn/10 text-amber-warn border border-amber-warn/20' :
                      'bg-cs-blue/10 text-cs-blue border border-cs-blue/20'
                    }`}>{ev.sevLabel}</span>
                    <span className={`flex-1 truncate ${ev.noise ? 'text-txt-dim' : 'text-txt-secondary'}`}>
                      {ev.msg}
                    </span>
                    {ev.mitre && !ev.noise && (
                      <span className="text-[8px] bg-void border border-cs-border px-1 py-0.5 text-txt-dim rounded-cs-sm font-bold tracking-widest">{ev.mitre}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative px-6 md:px-12 pb-24 z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[1200px] mx-auto">
          {[
            { value: '3', label: 'Attack Scenarios', color: 'text-cs-red' },
            { value: '80+', label: 'SIEM Event Templates', color: 'text-cs-blue' },
            { value: '100%', label: 'Real Tools - No Simulation', color: 'text-green-signal' },
            { value: '$0', label: 'Free Tier Stack', color: 'text-amber-warn' },
          ].map((s, i) => (
            <div key={i} className="card-v3 card-v3-spotlight text-center p-6 border border-cs-border/60 bg-[#0d0f14]/80">
              <div className={`text-4xl font-extrabold font-mono tracking-tighter mb-2 ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-txt-secondary">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="how">
        <div className="text-center mb-16">
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">// EXECUTION CHECKLIST //</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 card-v3-header-glow font-display">ONE PLATFORM. BOTH PERSPECTIVES.</h2>
          <p className="text-sm text-txt-secondary max-w-[560px] mx-auto leading-relaxed font-mono uppercase opacity-75">
            CyberSim bridges the gap between isolated tool training and
            real-world security operations by connecting both sides of every engagement.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
          {[
            { step: '1', title: 'Attack the target', desc: 'Launch a real Kali terminal. Run actual tools - nmap, sqlmap, Impacket, Hashcat - against containerized targets with genuine vulnerabilities. No simulations, no mock outputs.', color: 'text-cs-red border-cs-red/20 bg-cs-red/5' },
            { step: '2', title: 'Follow methodology', desc: 'CyberSim enforces PTES phases. Skip reconnaissance and jump to exploitation? Blocked. Document your findings before advancing. Methodology gating teaches professional discipline.', color: 'text-amber-warn border-amber-warn/20 bg-amber-warn/5' },
            { step: '3', title: 'Detect in real time', desc: 'Every attacker command triggers corresponding SIEM alerts within 2 seconds. Blue team sees the same attack from the defender\'s perspective - WAF alerts, event logs, network anomalies.', color: 'text-cs-blue border-cs-blue/20 bg-cs-blue/5' },
          ].map((c, i) => (
            <div key={i} className="card-v3 card-v3-interactive card-v3-spotlight p-8 group transition-all relative overflow-hidden bg-[#0d0f14]/80">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono text-xs font-bold mb-5 border ${c.color}`}>
                {c.step}
              </div>
              <h3 className="text-lg font-bold tracking-tight mb-3 font-display uppercase tracking-wide">{c.title}</h3>
              <p className="text-xs text-txt-secondary leading-relaxed font-mono opacity-80">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SCENARIOS */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="scenarios">
        <div className="text-center mb-16">
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">// SCENARIO NODES ACTIVE //</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 card-v3-header-glow font-display">REAL TARGETS. REAL VULNERABILITIES.</h2>
          <p className="text-sm text-txt-secondary max-w-[560px] mx-auto leading-relaxed font-mono uppercase opacity-75">
            Each scenario is a fully containerized environment running actual
            services with intentional security weaknesses.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-[1200px] mx-auto">
          {[
            { id: 'SC-01', cls: 'sc-01', title: 'NovaMed Healthcare Portal', desc: 'A PHP/Apache web application with patient records. Discover SQL injection, IDOR vulnerabilities, unrestricted file upload, and local file inclusion in a realistic hospital IT environment.', diff: 'Intermediate', diffCls: 'border-amber-warn/20 text-amber-warn bg-amber-warn/5', tags: ['OWASP Top 10', 'SQLi / LFI / IDOR'] },
            { id: 'SC-02', cls: 'sc-02', title: 'Nexora Financial AD', desc: 'A Samba4 Active Directory environment with a domain controller and file server. Perform Kerberoasting, crack service account hashes, move laterally, and attempt DCSync.', diff: 'Advanced', diffCls: 'border-critical/20 text-critical bg-critical/5', tags: ['Active Directory', 'Kerberos / SMB'] },
            { id: 'SC-03', cls: 'sc-03', title: 'Orion Logistics Phishing', desc: 'Conduct OSINT, craft a phishing campaign with GoPhish, deliver a payload through social engineering, and achieve initial access on a simulated corporate endpoint.', diff: 'Intermediate', diffCls: 'border-amber-warn/20 text-amber-warn bg-amber-warn/5', tags: ['Social Engineering', 'OSINT / Email'] },
          ].map((sc) => (
            <div key={sc.id} className="card-v3 card-v3-interactive card-v3-spotlight p-6 bg-[#0d0f14]/80 flex flex-col justify-between" onClick={goToPlatform}>
              <div>
                <div className="font-mono text-xs font-bold text-txt-dim bg-surface-3 px-2 py-0.5 rounded-cs-sm w-fit mb-4">{sc.id}</div>
                <h3 className="text-lg font-bold tracking-tight mb-2 font-display uppercase tracking-wide">{sc.title}</h3>
                <p className="text-xs text-txt-secondary leading-relaxed mb-6 font-mono opacity-80">{sc.desc}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-cs-sm font-mono text-[9px] font-medium border ${sc.diffCls}`}>{sc.diff}</span>
                {sc.tags.map(t => (
                  <span key={t} className="px-2.5 py-0.5 rounded-cs-sm font-mono text-[9px] font-medium border border-cs-border text-txt-dim bg-surface-2/40">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FRAMEWORKS */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="frameworks">
        <div className="text-center mb-12">
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">// COMPLIANCE MATRICES //</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 card-v3-header-glow font-display">INDUSTRY-STANDARD METHODOLOGY</h2>
          <p className="text-sm text-txt-secondary max-w-[560px] mx-auto leading-relaxed font-mono uppercase opacity-75">
            Every action, hint, and score maps to recognized professional frameworks.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center max-w-[1200px] mx-auto">
          {[
            { name: 'MITRE ATT&CK', color: 'bg-cs-red shadow-red-glow' },
            { name: 'PTES', color: 'bg-amber-warn' },
            { name: 'NIST CSF / 800-61', color: 'bg-cs-blue shadow-blue-glow' },
            { name: 'OWASP Testing Guide v4.2', color: 'bg-green-signal' },
            { name: 'CVSS v3.1', color: 'bg-critical' },
          ].map(f => (
            <div key={f.name} className="flex items-center gap-2 px-3 py-1.5 rounded-cs border border-cs-border bg-[#0d0f14] font-mono text-[10px] text-txt-secondary uppercase tracking-wider">
              <span className={`w-2 h-2 rounded-sm ${f.color}`} />
              {f.name}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 md:px-12 py-24 text-center z-10 max-w-[1200px] mx-auto">
        <div className="absolute inset-0 z-0 opacity-40" style={{
          background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(255,59,59,0.04), transparent), radial-gradient(ellipse 60% 40% at 70% 50%, rgba(59,139,255,0.04), transparent)'
        }} />
        <div className="relative z-10 card-v3 card-v3-spotlight p-12 bg-void/70 hud-corner-ticks">
          <div className="absolute top-4 right-4 flex items-center gap-2"><span className="radar-scanner inline-block" /><span className="font-mono text-[9px] text-[#00f3ff]">TACTICAL RADAR</span></div>
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">// RET-5 SYSTEMS READY //</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 card-v3-header-glow font-display">
            STOP LEARNING TOOLS IN ISOLATION.<br />
            START SEEING THE FULL PICTURE.
          </h2>
          <p className="text-sm text-txt-secondary max-w-[500px] mx-auto mb-10 leading-relaxed font-mono uppercase opacity-75">
            Every attacker action has a defensive consequence.
            CyberSim makes that connection visible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goToPlatform} className="btn-v3 btn-v3-red text-xs">Begin SC-01: Web App Pentest</button>
            <a href="#how" className="btn-v3 btn-v3-subtle text-xs">View Demo</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 py-12 border-t border-cs-border flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="font-mono text-xs text-txt-dim">
          CyberSim (c) 2026 - Built for cybersecurity students. $0 infrastructure cost.
        </div>
        <div className="flex gap-6">
          <a href="https://github.com" target="_blank" rel="noopener" className="font-mono text-xs text-txt-dim hover:text-txt-secondary transition-colors">GitHub</a>
          <a href="#" className="font-mono text-xs text-txt-dim hover:text-txt-secondary transition-colors">Documentation</a>
          <a href="#" className="font-mono text-xs text-txt-dim hover:text-txt-secondary transition-colors">Architecture</a>
        </div>
      </footer>
    </div>
  )
}
