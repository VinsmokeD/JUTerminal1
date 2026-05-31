import { Suspense, lazy, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion'
import ParticleCanvas from '../components/canvas/ParticleCanvas'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePerfTier } from '../components/ui/PerfTier'
import RevealText from '../components/motion/RevealText'
import Marquee from '../components/motion/Marquee'
import useMagnetic from '../hooks/useMagnetic'
import useCursorIntent from '../hooks/useCursorIntent'
import { sectionReveal, useReducedMotionSafe } from '../lib/motion'

const HeroScene3D = lazy(() => import('../components/canvas/HeroScene3D'))

// ── Magnetic CTA button ────────────────────────────────────────────────────
function MagneticButton({ onClick, className, children }) {
  const { ref, x, y, bind } = useMagnetic({ strength: 0.35 })
  return (
    <motion.button
      ref={ref}
      {...bind}
      onClick={onClick}
      className={className}
      style={{ x, y }}
    >
      {children}
    </motion.button>
  )
}

// ── Pin-and-stack card ────────────────────────────────────────────────────
function StackCard({ step, title, desc, color, offset }) {
  return (
    <div
      className="sticky glass p-8 transition-all relative overflow-hidden bg-[#0d0f14]/85"
      style={{
        top: `calc(88px + ${offset * 24}px)`,
        marginBottom: '1.5rem',
        zIndex: 10 + offset,
        transform: `scale(${1 - offset * 0.018})`,
        transformOrigin: 'top center',
        transition: 'transform 0.3s',
      }}
    >
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono text-xs font-bold mb-5 border ${color}`}>
        {step}
      </div>
      <h3 className="text-lg font-bold tracking-tight mb-3 font-display text-txt-primary">{title}</h3>
      <p className="text-xs text-txt-secondary leading-relaxed font-display">{desc}</p>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-surface-3/10 pointer-events-none" />
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const tier = usePerfTier()
  const reduced = useReducedMotionSafe()

  // Global cursor spotlight (spring-lagged)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { damping: 45, stiffness: 180 })
  const springY = useSpring(mouseY, { damping: 45, stiffness: 180 })
  const spotlightBg = useTransform(
    [springX, springY],
    ([x, y]) => `radial-gradient(900px circle at ${x}px ${y}px, rgba(76,194,255,0.05) 0%, rgba(155,125,255,0.03) 40%, transparent 80%)`,
  )

  useEffect(() => {
    const handleMove = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY) }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [mouseX, mouseY])

  const goToPlatform = () => navigate(token ? '/dashboard' : '/auth')

  // Hero parallax
  const heroRef = useRef(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(heroScroll, [0, 1], [0, reduced ? 0 : -60])

  // Cursor intents for scenario cards
  const engageCursor = useCursorIntent({ intent: 'engage', label: 'ENGAGE', mode: 'red' })

  // Red/Blue CTA cursor intents
  const redCursor = useCursorIntent({ intent: 'launch', label: 'LAUNCH', mode: 'red' })
  const blueCursor = useCursorIntent({ intent: 'launch', label: 'LAUNCH', mode: 'blue' })

  return (
    <div className="min-h-dvh bg-void text-txt-primary font-display relative">
      {/* Global cursor spotlight overlay */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-30 opacity-70"
        style={{ background: spotlightBg }}
      />

      {/* ── NAVIGATION ─────────────────────────────────────── */}
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
            <MagneticButton onClick={goToPlatform} className="btn-v3 btn-v3-blue btn-v3-sm">
              Launch Platform
            </MagneticButton>
          </li>
        </ul>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12 pt-32 pb-20 overflow-hidden">
        {tier >= 1 ? (
          <Suspense fallback={<ParticleCanvas />}>
            <HeroScene3D />
          </Suspense>
        ) : (
          <ParticleCanvas />
        )}

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1], delay: 0.12 }}
          style={{ y: heroY }}
          className="relative z-10 text-center w-full max-w-[900px] border border-cs-border/30 bg-void/60 backdrop-blur-md p-6 sm:p-10 md:p-16 rounded-cs shadow-2xl"
        >
          {/* Online badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-cs-border/60 rounded-cs font-mono text-[10px] text-txt-secondary mb-8 uppercase tracking-widest"
          >
            <span className="w-2 h-2 rounded-full bg-green-signal animate-pulse shadow-green-glow" />
            Platform Online — 3 Scenarios Active
          </motion.div>

          {/* Hero headline — word reveal */}
          <div className="text-[1.75rem] sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.12] tracking-tighter mb-6 font-display" role="heading" aria-level="1">
            <RevealText
              as="div"
              stagger={0.09}
              delay={0.5}
              className="block"
            >
              Attack. Defend.
            </RevealText>
            <RevealText
              as="div"
              stagger={0.09}
              delay={0.82}
              className="block text-txt-dim tracking-tight"
            >
              Simultaneously.
            </RevealText>
          </div>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1], delay: 1.1 }}
            className="text-sm md:text-base text-txt-secondary leading-relaxed max-w-[580px] mx-auto mb-10 font-display"
          >
            The first training platform where every attacker command triggers real-time
            SIEM alerts on the defender's screen. Learn both sides of cybersecurity
            in one environment.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              {...redCursor.bind}
              onClick={goToPlatform}
              className="btn-v3 btn-v3-red text-xs"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="mr-1">
                <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Start Red Team
            </motion.button>
            <motion.button
              {...blueCursor.bind}
              onClick={goToPlatform}
              className="btn-v3 btn-v3-blue text-xs"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="mr-1">
                <path d="M2 8a6 6 0 1112 0A6 6 0 012 8z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Start Blue Team
            </motion.button>
            <a href="#how" className="btn-v3 btn-v3-subtle text-xs">Learn More</a>
          </motion.div>
        </motion.div>
      </section>

      {/* ── LIVE DEMO ──────────────────────────────────────── */}
      <section className="relative px-6 md:px-12 pb-24 z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="max-w-[1200px] mx-auto glass p-0 overflow-hidden"
        >
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
          <div className="grid md:grid-cols-2 min-h-[420px]">
            <div className="relative border-r border-cs-border overflow-hidden bg-void/60">
              <div className="absolute inset-0 bg-cs-red/[0.01]" />
              <div className="flex items-center justify-between px-4 py-2 border-b border-cs-border bg-surface-1/40 font-mono text-[9px] text-cs-red tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-red animate-pulse" />
                  KALI TERMINAL — ENFORCED METHODOLOGY GATES
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
                <div className="text-amber-warn">/backup/ (Status: 200) [Size: 3842]</div>
                <div><span className="text-cs-red">student@kali:~$ </span><span className="inline-block w-1.5 h-3 bg-cs-red animate-pulse" /></div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-void/60">
              <div className="absolute inset-0 bg-cs-blue/[0.01]" />
              <div className="flex items-center justify-between px-4 py-2 border-b border-cs-border bg-surface-1/40 font-mono text-[9px] text-cs-blue tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-blue animate-pulse" />
                  SURICATA / EVENT METADATA PARSER
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="radar-scanner inline-block" /> TELEMETRY STREAM
                </div>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { time: '14:03:44', sev: 'MED',  msg: 'Port scan detected — SYN packets to 1024+ ports', mitre: 'T1046' },
                  { time: '14:03:52', sev: 'INFO', msg: 'Service version probe — nmap fingerprinting', mitre: 'T1046' },
                  { time: '14:04:01', sev: 'INFO', msg: 'Routine health check — GET /api/health [noise]', noise: true },
                  { time: '14:06:11', sev: 'MED',  msg: 'Directory brute-force — 400+ 404s in 30s', mitre: 'T1083' },
                  { time: '14:06:44', sev: 'HIGH', msg: 'Sensitive path probed — /backup/ returned 200', mitre: 'T1083' },
                ].map((ev, i) => (
                  <div key={i} className={`flex items-center gap-3 p-1.5 font-mono text-[10px] rounded-cs border border-transparent ${
                    ev.noise ? 'opacity-40 hover:opacity-75' : 'bg-surface-2/40 border-cs-border/40 hover:border-cs-border'
                  } transition-all`}>
                    <span className="text-txt-dim">{ev.time}</span>
                    <span className={`px-1.5 py-0.5 rounded-cs-sm font-bold text-[8px] tracking-wide ${
                      ev.sev === 'HIGH' ? 'bg-critical/10 text-critical border border-critical/20' :
                      ev.sev === 'MED'  ? 'bg-amber-warn/10 text-amber-warn border border-amber-warn/20' :
                      'bg-cs-blue/10 text-cs-blue border border-cs-blue/20'
                    }`}>{ev.sev}</span>
                    <span className={`flex-1 truncate ${ev.noise ? 'text-txt-dim' : 'text-txt-secondary'}`}>{ev.msg}</span>
                    {ev.mitre && !ev.noise && (
                      <span className="text-[8px] bg-void border border-cs-border px-1 py-0.5 text-txt-dim rounded-cs-sm font-bold tracking-widest">{ev.mitre}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section className="relative px-6 md:px-12 pb-24 z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[1200px] mx-auto">
          {[
            { value: '3',    label: 'Attack Scenarios',          color: 'text-cs-red' },
            { value: '80+',  label: 'SIEM Event Templates',      color: 'text-cs-blue' },
            { value: '100%', label: 'Real Tools — No Simulation', color: 'text-green-signal' },
            { value: '$0',   label: 'Free Tier Stack',            color: 'text-amber-warn' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="glass text-center p-6 bg-[#0d0f14]/80 cursor-pointer"
            >
              <div className={`text-4xl font-extrabold font-mono tracking-tighter mb-2 ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-txt-secondary">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS — pin-and-stack ───────────────────── */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="how">
        <div className="text-center mb-16">
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4"
          >
            // EXECUTION CHECKLIST //
          </motion.div>
          <RevealText
            as="h2"
            className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 font-display text-txt-primary"
            stagger={0.07}
          >
            One Platform. Both Perspectives.
          </RevealText>
          <motion.p
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-sm text-txt-secondary max-w-[560px] mx-auto leading-relaxed font-display"
          >
            CyberSim bridges the gap between isolated tool training and
            real-world security operations by connecting both sides of every engagement.
          </motion.p>
        </div>

        {/* Stack cards — CSS sticky, each offset by ~24px */}
        <div className="max-w-[680px] mx-auto" style={{ paddingBottom: '6rem' }}>
          {[
            {
              step: '1', offset: 0,
              title: 'Attack the target',
              desc: 'Launch a real Kali terminal. Run actual tools — nmap, sqlmap, Impacket, Hashcat — against containerized targets with genuine vulnerabilities. No simulations, no mock outputs.',
              color: 'text-cs-red border-cs-red/20 bg-cs-red/5',
            },
            {
              step: '2', offset: 1,
              title: 'Follow methodology',
              desc: 'CyberSim enforces PTES phases. Skip reconnaissance and jump to exploitation? Blocked. Document your findings before advancing. Methodology gating teaches professional discipline.',
              color: 'text-amber-warn border-amber-warn/20 bg-amber-warn/5',
            },
            {
              step: '3', offset: 2,
              title: 'Detect in real time',
              desc: "Every attacker command triggers corresponding SIEM alerts within 2 seconds. Blue team sees the same attack from the defender's perspective — WAF alerts, event logs, network anomalies.",
              color: 'text-cs-blue border-cs-blue/20 bg-cs-blue/5',
            },
          ].map((c) => (
            <StackCard key={c.step} {...c} />
          ))}
        </div>
      </section>

      {/* ── SCENARIOS ──────────────────────────────────────── */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="scenarios">
        <div className="text-center mb-16">
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4"
          >
            // SCENARIO NODES ACTIVE //
          </motion.div>
          <RevealText
            as="h2"
            className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 font-display text-txt-primary"
            stagger={0.07}
          >
            Real Targets. Real Vulnerabilities.
          </RevealText>
          <motion.p
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-sm text-txt-secondary max-w-[560px] mx-auto leading-relaxed font-display"
          >
            Each scenario is a fully containerized environment running actual
            services with intentional security weaknesses.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-[1200px] mx-auto">
          {[
            { id: 'SC-01', title: 'NovaMed Healthcare Portal',   diff: 'Intermediate', diffCls: 'border-amber-warn/20 text-amber-warn bg-amber-warn/5', tags: ['OWASP Top 10', 'SQLi / LFI / IDOR'],       desc: 'A PHP/Apache web application with patient records. Discover SQL injection, IDOR vulnerabilities, unrestricted file upload, and local file inclusion in a realistic hospital IT environment.' },
            { id: 'SC-02', title: 'Nexora Financial AD',         diff: 'Advanced',     diffCls: 'border-critical/20 text-critical bg-critical/5',         tags: ['Active Directory', 'Kerberos / SMB'],      desc: 'A Samba4 Active Directory environment with a domain controller and file server. Perform Kerberoasting, crack service account hashes, move laterally, and attempt DCSync.' },
            { id: 'SC-03', title: 'Orion Logistics Phishing',   diff: 'Intermediate', diffCls: 'border-amber-warn/20 text-amber-warn bg-amber-warn/5', tags: ['Social Engineering', 'OSINT / Email'],       desc: 'Conduct OSINT, craft a phishing campaign with GoPhish, deliver a payload through social engineering, and achieve initial access on a simulated corporate endpoint.' },
          ].map((sc, i) => (
            <motion.div
              key={sc.id}
              {...engageCursor.bind}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -10, scale: 1.025, boxShadow: '0 20px 40px rgba(0,243,255,0.06)' }}
              className="glass p-6 bg-[#0d0f14]/80 flex flex-col justify-between cursor-pointer group hover:border-[#4CC2FF]/30 transition-all duration-300 relative overflow-hidden"
              onClick={goToPlatform}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#4CC2FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="relative z-10">
                <div className="font-mono text-xs font-bold text-txt-dim bg-surface-3 px-2 py-0.5 rounded-cs-sm w-fit mb-4 transition-colors group-hover:bg-[#4CC2FF]/10 group-hover:text-[#4CC2FF]">{sc.id}</div>
                <h3 className="text-lg font-bold tracking-tight mb-2 font-display text-txt-primary group-hover:text-[#4CC2FF] transition-colors">{sc.title}</h3>
                <p className="text-xs text-txt-secondary leading-relaxed mb-6 font-display group-hover:text-txt-primary transition-colors">{sc.desc}</p>
              </div>
              <div className="flex gap-2 flex-wrap relative z-10">
                <span className={`px-2.5 py-0.5 rounded-cs-sm font-mono text-[9px] font-medium border ${sc.diffCls}`}>{sc.diff}</span>
                {sc.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-0.5 rounded-cs-sm font-mono text-[9px] font-medium border border-cs-border text-txt-dim bg-surface-2/40 group-hover:border-cs-border/60 transition-colors">{tag}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FRAMEWORKS — infinite marquee ──────────────────── */}
      <section className="relative px-6 md:px-12 py-24 z-10" id="frameworks">
        <div className="text-center mb-12">
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4"
          >
            // COMPLIANCE MATRICES //
          </motion.div>
          <RevealText
            as="h2"
            className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 font-display text-txt-primary"
            stagger={0.06}
          >
            Industry-Standard Methodology
          </RevealText>
          <motion.p
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-sm text-txt-secondary max-w-[560px] mx-auto leading-relaxed font-display"
          >
            Every action, hint, and score maps to recognized professional frameworks.
          </motion.p>
        </div>

        <Marquee duration={28} gap="2.5rem" className="py-2 max-w-[1200px] mx-auto">
          {[
            { name: 'MITRE ATT&CK',           dot: 'bg-cs-red shadow-red-glow' },
            { name: 'PTES',                    dot: 'bg-amber-warn' },
            { name: 'NIST CSF / 800-61',       dot: 'bg-cs-blue shadow-blue-glow' },
            { name: 'OWASP Testing Guide v4.2', dot: 'bg-green-signal' },
            { name: 'CVSS v3.1',               dot: 'bg-critical' },
            { name: 'Kill Chain Model',         dot: 'bg-[#9B7DFF]' },
          ].map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-2.5 px-4 py-2 rounded-cs border border-cs-border bg-[#0d0f14]/90 font-display text-xs text-txt-secondary whitespace-nowrap flex-shrink-0 hover:border-cs-border/80 transition-colors"
            >
              <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${f.dot}`} />
              {f.name}
            </div>
          ))}
        </Marquee>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="relative px-6 md:px-12 py-24 text-center z-10 max-w-[1200px] mx-auto">
        <div
          className="absolute inset-0 z-0 opacity-40"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(255,59,59,0.04), transparent), radial-gradient(ellipse 60% 40% at 70% 50%, rgba(59,139,255,0.04), transparent)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="relative z-10 glass p-12 bg-void/70 overflow-hidden group"
        >
          {/* Dual accent lines */}
          <div className="absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, #ff3b3b 30%, #4CC2FF 70%, transparent)' }}
          />
          <div className="font-mono text-xs font-semibold uppercase tracking-[3px] text-txt-dim mb-4">// RET-5 SYSTEMS READY //</div>
          <RevealText
            as="h2"
            className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-5 font-display text-txt-primary"
            stagger={0.06}
          >
            Stop learning tools in isolation.
          </RevealText>
          <motion.p
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-sm text-txt-secondary max-w-[500px] mx-auto mb-10 leading-relaxed font-display"
          >
            Every attacker action has a defensive consequence.
            CyberSim makes that connection visible.
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <MagneticButton onClick={goToPlatform} className="btn-v3 btn-v3-red text-xs">
              Begin SC-01: Web App Pentest
            </MagneticButton>
            <a href="#how" className="btn-v3 btn-v3-subtle text-xs">View Demo</a>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-12 border-t border-cs-border flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="font-mono text-xs text-txt-dim">
          CyberSim © 2026 — Built for cybersecurity students. $0 infrastructure cost.
        </div>
        <div className="flex gap-6">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-txt-dim hover:text-txt-secondary transition-colors">GitHub</a>
          <a href="#" className="font-mono text-xs text-txt-dim hover:text-txt-secondary transition-colors">Documentation</a>
          <a href="#" className="font-mono text-xs text-txt-dim hover:text-txt-secondary transition-colors">Architecture</a>
        </div>
      </footer>
    </div>
  )
}
