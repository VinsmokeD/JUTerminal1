import ParticleCanvas from '../components/canvas/ParticleCanvas'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Landing — Public landing page with hero, live demo, scenarios, stats, CTA.
 * Renders the full SOC-aesthetic marketing page.
 * Unauthenticated users see this; authenticated users can still access it.
 */
export default function Landing() {
  const navigate = useNavigate()
  const { token } = useAuthStore()

  const goToPlatform = () => navigate(token ? '/dashboard' : '/auth')

  return (
    <div className="min-h-screen bg-void text-txt-primary font-display">
      {/* ═══════════ NAVIGATION ═══════════ */}
      <nav className="nav-bar fixed top-0 left-0 right-0 z-50">
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <div className="nav-logo-icon" />
          <div className="font-mono text-lg font-bold text-txt-primary tracking-tight">
            CyberSim<span className="text-txt-dim font-normal">.io</span>
          </div>
        </button>
        <ul className="hidden md:flex items-center gap-8 list-none">
          <li><a href="#scenarios" className="text-txt-secondary hover:text-txt-primary text-sm font-medium transition-colors">Scenarios</a></li>
          <li><a href="#how" className="text-txt-secondary hover:text-txt-primary text-sm font-medium transition-colors">How It Works</a></li>
          <li><a href="#frameworks" className="text-txt-secondary hover:text-txt-primary text-sm font-medium transition-colors">Frameworks</a></li>
          <li>
            <button onClick={goToPlatform} className="btn btn-blue btn-sm">
              Launch Platform
            </button>
          </li>
        </ul>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12 pt-32 pb-20 overflow-hidden">
        <ParticleCanvas />
        <div className="relative z-10 text-center max-w-[900px]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-cs-border rounded-full text-xs font-mono text-txt-secondary mb-8 animate-fade-up">
            <span className="dot-live" />
            Platform Online — 3 Scenarios Active
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tighter mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="text-cs-red">Attack.</span>{' '}
            <span className="text-cs-blue">Defend.</span>
            <br />
            <span className="text-txt-dim">Simultaneously.</span>
          </h1>

          {/* Sub */}
          <p className="text-lg text-txt-secondary leading-relaxed max-w-[640px] mx-auto mb-12 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            The first training platform where every attacker command triggers real-time
            SIEM alerts on the defender's screen. Learn both sides of cybersecurity
            in one environment.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <button onClick={goToPlatform} className="btn btn-red">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Start Red Team
            </button>
            <button onClick={goToPlatform} className="btn btn-blue">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1112 0A6 6 0 012 8z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Start Blue Team
            </button>
            <a href="#how" className="btn btn-ghost">Learn More</a>
          </div>
        </div>
      </section>

      {/* ═══════════ LIVE DEMO ═══════════ */}
      <section className="relative px-6 md:px-12 pb-24 z-10">
        <div className="max-w-[1200px] mx-auto rounded-cs-lg border border-cs-border overflow-hidden bg-surface-1 shadow-demo-frame animate-fade-up" style={{ animationDelay: '0.5s' }}>
          {/* Window bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-surface-2 border-b border-cs-border">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-critical" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-warn" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-signal" />
            </div>
            <div className="font-mono text-xs text-txt-dim">cybersim — SC-01: NovaMed Healthcare Portal</div>
            <div className="flex gap-0.5">
              <span className="px-3 py-1 rounded-cs-sm font-mono text-xs font-medium text-cs-red bg-cs-red-dim">● RED</span>
              <span className="px-3 py-1 rounded-cs-sm font-mono text-xs font-medium text-cs-blue bg-cs-blue-dim">● BLUE</span>
            </div>
          </div>

          {/* Dual pane */}
          <div className="grid md:grid-cols-2 min-h-[420px]">
            {/* RED — Terminal */}
            <div className="relative border-r border-cs-border overflow-hidden">
              <div className="absolute inset-0 bg-red-surface" />
              <div className="panel-header relative z-10 text-cs-red">
                <span className="panel-header-dot red" />
                Kali Terminal — Reconnaissance
              </div>
              <div className="relative z-10 p-4 font-mono text-xs leading-[1.8] text-txt-secondary">
                <div><span className="text-cs-red">┌──(student㉿kali)-[~]</span></div>
                <div><span className="text-cs-red">└─$ </span><span className="text-txt-primary">nmap -sV -p 80,443,3306 172.20.1.20</span></div>
                <div className="text-txt-dim">Starting Nmap 7.94 ( https://nmap.org )</div>
                <div className="text-txt-dim">PORT     STATE SERVICE VERSION</div>
                <div className="text-green-signal">80/tcp   open  http    Apache httpd 2.4.49</div>
                <div className="text-green-signal">443/tcp  open  ssl     OpenSSL 1.1.1</div>
                <div className="text-green-signal">3306/tcp open  mysql   MySQL 5.7.38</div>
                <div>&nbsp;</div>
                <div><span className="text-cs-red">└─$ </span><span className="text-txt-primary">gobuster dir -u http://172.20.1.20 -w /usr/share/wordlists/common.txt</span></div>
                <div className="text-amber-warn">/backup/              (Status: 200) [Size: 3842]</div>
                <div><span className="text-cs-red">└─$ </span><span className="cursor-blink" /></div>
              </div>
            </div>

            {/* BLUE — SIEM */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-surface" />
              <div className="panel-header relative z-10 text-cs-blue">
                <span className="panel-header-dot blue" />
                SIEM Feed — Live Detections
              </div>
              <div className="relative z-10 p-2 space-y-0.5">
                {[
                  { time: '14:03:44', sev: 'sev-med', sevLabel: 'MED', msg: 'Port scan detected — SYN packets to 1024+ ports from 172.20.1.100', mitre: 'T1046' },
                  { time: '14:03:52', sev: 'sev-info', sevLabel: 'INFO', msg: 'Service version probe — nmap fingerprinting on Apache', mitre: 'T1046' },
                  { time: '14:04:01', sev: 'sev-info', sevLabel: 'INFO', msg: 'Routine health check — GET /api/health from 172.20.1.5 [noise]', noise: true },
                  { time: '14:06:11', sev: 'sev-med', sevLabel: 'MED', msg: 'Directory brute-force — 400+ 404 responses in 30s from single source', mitre: 'T1083' },
                  { time: '14:06:44', sev: 'sev-high', sevLabel: 'HIGH', msg: 'Sensitive path probed — /backup/ returned 200 (directory listing enabled)', mitre: 'T1083' },
                ].map((ev, i) => (
                  <div key={i} className={`siem-event-row ${ev.noise ? 'noise' : ''}`}>
                    <span className="siem-time">{ev.time}</span>
                    <span className={`badge ${ev.sev}`}>{ev.sevLabel}</span>
                    <span className={ev.noise ? 'text-txt-dim' : 'text-txt-secondary'}>
                      {ev.msg}
                      {ev.mitre && !ev.noise && <span className="siem-mitre ml-1.5">{ev.mitre}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="relative px-6 md:px-12 pb-24 z-10">
        <div className="stats-bar max-w-[1200px] mx-auto">
          {[
            { value: '3', label: 'Attack Scenarios', color: 'text-cs-red' },
            { value: '80+', label: 'SIEM Event Templates', color: 'text-cs-blue' },
            { value: '100%', label: 'Real Tools — No Simulation', color: 'text-green-signal' },
            { value: '$0', label: 'Free Tier Stack', color: 'text-amber-warn' },
          ].map((s, i) => (
            <div key={i} className="stat">
              <div className={`stat-value ${s.color}`}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="how">
        <div className="text-center mb-16">
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">How It Works</div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-5">One platform. Both perspectives.</h2>
          <p className="text-lg text-txt-secondary max-w-[560px] mx-auto leading-relaxed">
            CyberSim bridges the gap between isolated tool training and
            real-world security operations by connecting both sides of every engagement.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
          {[
            { step: '1', title: 'Attack the target', desc: 'Launch a real Kali terminal. Run actual tools — nmap, sqlmap, Impacket, Hashcat — against containerized targets with genuine vulnerabilities. No simulations, no mock outputs.', color: 'text-cs-red border-cs-red-dim' },
            { step: '2', title: 'Follow methodology', desc: 'CyberSim enforces PTES phases. Skip reconnaissance and jump to exploitation? Blocked. Document your findings before advancing. Methodology gating teaches professional discipline.', color: 'text-amber-warn border-cs-border' },
            { step: '3', title: 'Detect in real time', desc: 'Every attacker command triggers corresponding SIEM alerts within 2 seconds. Blue team sees the same attack from the defender\'s perspective — WAF alerts, event logs, network anomalies.', color: 'text-cs-blue border-cs-blue-dim' },
          ].map((c, i) => (
            <div key={i} className="card p-8 group hover:border-cs-border-glow hover:-translate-y-1 transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cs-blue to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-3 border font-mono text-sm font-bold mb-5 ${c.color}`}>
                {c.step}
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">{c.title}</h3>
              <p className="text-sm text-txt-secondary leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ SCENARIOS ═══════════ */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="scenarios">
        <div className="text-center mb-16">
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">Training Scenarios</div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-5">Real targets. Real vulnerabilities.</h2>
          <p className="text-lg text-txt-secondary max-w-[560px] mx-auto leading-relaxed">
            Each scenario is a fully containerized environment running actual
            services with intentional security weaknesses.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-[1200px] mx-auto">
          {[
            { id: 'SC-01', cls: 'sc-01', title: 'NovaMed Healthcare Portal', desc: 'A PHP/Apache web application with patient records. Discover SQL injection, IDOR vulnerabilities, unrestricted file upload, and local file inclusion in a realistic hospital IT environment.', diff: 'Intermediate', diffCls: 'difficulty-inter', tags: ['OWASP Top 10', 'SQLi • LFI • IDOR'] },
            { id: 'SC-02', cls: 'sc-02', title: 'Nexora Financial AD', desc: 'A Samba4 Active Directory environment with a domain controller and file server. Perform Kerberoasting, crack service account hashes, move laterally, and attempt DCSync.', diff: 'Advanced', diffCls: 'difficulty-adv', tags: ['Active Directory', 'Kerberos • SMB'] },
            { id: 'SC-03', cls: 'sc-03', title: 'Orion Logistics Phishing', desc: 'Conduct OSINT, craft a phishing campaign with GoPhish, deliver a payload through social engineering, and achieve initial access on a simulated corporate endpoint.', diff: 'Intermediate', diffCls: 'difficulty-inter', tags: ['Social Engineering', 'OSINT • Email'] },
          ].map((sc) => (
            <div key={sc.id} className={`scenario-card ${sc.cls}`} onClick={goToPlatform}>
              <div className="scenario-id">{sc.id}</div>
              <h3 className="text-xl font-bold tracking-tight mb-2">{sc.title}</h3>
              <p className="text-sm text-txt-secondary leading-relaxed mb-5">{sc.desc}</p>
              <div className="flex gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium border border-cs-border ${sc.diffCls}`}>{sc.diff}</span>
                {sc.tags.map(t => (
                  <span key={t} className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium border border-cs-border text-txt-dim">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FRAMEWORKS ═══════════ */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="frameworks">
        <div className="text-center mb-12">
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">Framework Alignment</div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-5">Industry-standard methodology</h2>
          <p className="text-lg text-txt-secondary max-w-[560px] mx-auto leading-relaxed">
            Every action, hint, and score maps to recognized professional frameworks.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center max-w-[1200px] mx-auto">
          {[
            { name: 'MITRE ATT&CK', color: 'bg-cs-red' },
            { name: 'PTES', color: 'bg-amber-warn' },
            { name: 'NIST CSF / 800-61', color: 'bg-cs-blue' },
            { name: 'OWASP Testing Guide v4.2', color: 'bg-green-signal' },
            { name: 'CVSS v3.1', color: 'bg-critical' },
          ].map(f => (
            <div key={f.name} className="framework-pill">
              <span className={`w-2 h-2 rounded-sm ${f.color}`} />
              {f.name}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="relative px-6 md:px-12 py-24 text-center z-10">
        <div className="absolute inset-0 z-0" style={{
          background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(255,59,59,0.06), transparent), radial-gradient(ellipse 60% 40% at 70% 50%, rgba(59,139,255,0.06), transparent)'
        }} />
        <div className="relative z-10">
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">Ready to train?</div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-5 max-w-[700px] mx-auto">
            Stop learning tools in isolation.<br />
            Start seeing the full picture.
          </h2>
          <p className="text-lg text-txt-secondary max-w-[500px] mx-auto mb-10 leading-relaxed">
            Every attacker action has a defensive consequence.
            CyberSim makes that connection visible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goToPlatform} className="btn btn-red">Begin SC-01: Web App Pentest</button>
            <a href="#how" className="btn btn-ghost">View Demo</a>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="px-6 md:px-12 py-12 border-t border-cs-border flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="font-mono text-xs text-txt-dim">
          CyberSim © 2026 — Built for cybersecurity students. $0 infrastructure cost.
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
