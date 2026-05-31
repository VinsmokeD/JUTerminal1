/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * TWO-TIER COLOR IDENTITY (V5 â€” Option A, locked 2026-05-30)
         * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
         * DUALITY (cs-red / cs-blue)   = semantic layer: text, borders, severity
         * HUD NEON (hud-crimson / hud-cyan) = glow/accent layer: box-shadows only
         * Never use hud-* for readable text or solid borders.
         */

        /* Tier 1 â€” Duality (semantic/legible) */
        'cs-red': {
          DEFAULT: '#FF6B7A',      /* coral red */
          glow: 'rgba(255, 107, 122, 0.4)',
          dim: 'rgba(255, 107, 122, 0.15)',
          surface: '#1c1214',
        },
        'cs-blue': {
          DEFAULT: '#4CC2FF',      /* electric cyan-blue */
          glow: 'rgba(76, 194, 255, 0.4)',
          dim: 'rgba(76, 194, 255, 0.15)',
          surface: '#0d1320',
        },

        /* Tier 2 â€” HUD Neon (glow/accent) */
        'hud-void': '#0A0E17',
        'hud-cyan': '#4CC2FF',
        'hud-crimson': '#FF6B7A',

        /* Neutrals */
        void: '#0A0E17',
        'surface-1': '#111726',
        'surface-2': '#151C2E',
        'surface-3': '#1B2438',
        'surface-4': '#222941',
        'surface-hover': '#242e47',
        'cs-border': 'rgba(148, 163, 184, 0.10)',
        'cs-border-glow': 'rgba(148, 163, 184, 0.20)',

        /* Text (AA-contrast tuned) */
        'txt-primary': '#E9EDF6',
        'txt-secondary': '#AAB4C8',
        'txt-dim': '#8E9CB5',
        'txt-ghost': '#3f495a',

        /* Semantic accents */
        'green-signal': '#3DD68C',
        'amber-warn': '#F4B740',
        critical: '#FF5C6C',
        magenta: '#9B7DFF',      /* AI / Pro-Tip violet accent */
      },
      fontFamily: {
        /* hud     â€” Orbitron: hero wordmark + large HUD numerals ONLY */
        hud:     ['"Orbitron"', 'sans-serif'],
        /* display â€” Inter: all headings, labels, UI text (premium convergence) */
        display: ['"Inter"', 'sans-serif'],
        /* body    â€” Inter: paragraphs / controls (alias of display) */
        body:    ['"Inter"', 'sans-serif'],
        /* mono    â€” JetBrains Mono: terminal, SIEM, IPs, scores, code */
        mono:    ['"JetBrains Mono"', '"Cascadia Code"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        /* Parallax type scale v3 - [size, { lineHeight, letterSpacing, fontWeight }] */
        'display-1': ['72px', { lineHeight: '76px', letterSpacing: '-0.04em', fontWeight: '800' }],
        'display-2': ['56px', { lineHeight: '60px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-3': ['40px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'title-1':   ['28px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-2':   ['20px', { lineHeight: '26px', letterSpacing: '0',       fontWeight: '600' }],
        'body-1':    ['16px', { lineHeight: '24px', letterSpacing: '0',       fontWeight: '400' }],
        'body-2':    ['14px', { lineHeight: '20px', letterSpacing: '0',       fontWeight: '400' }],
        'caption':   ['12px', { lineHeight: '16px', letterSpacing: '0.04em',  fontWeight: '500' }],
        'mono-1':    ['14px', { lineHeight: '20px', letterSpacing: '0',       fontWeight: '500' }],
        'mono-2':    ['12px', { lineHeight: '18px', letterSpacing: '0',       fontWeight: '400' }],
      },
      spacing: {
        /* 8px base grid, 4px micro */
        '1': '4px', '2': '8px', '3': '12px', '4': '16px',
        '6': '24px', '8': '32px', '12': '48px', '16': '64px', '24': '96px',
      },
      borderRadius: {
        cs: '8px',
        'cs-sm': '4px',
        'cs-lg': '12px',
        'cs-xl': '20px',
      },
      boxShadow: {
        'red-glow': '0 4px 24px #ff3b3b40, inset 0 1px 0 rgba(255,255,255,0.15)',
        'blue-glow': '0 4px 24px #3b8bff40, inset 0 1px 0 rgba(255,255,255,0.15)',
        'red-hover': '0 8px 40px rgba(255,59,59,0.5)',
        'blue-hover': '0 8px 40px rgba(59,139,255,0.5)',
        'card-hover': '0 20px 60px -12px rgba(0,0,0,0.5)',
        'demo-frame': '0 24px 80px -12px rgba(0,0,0,0.6), 0 0 120px -40px rgba(59,139,255,0.08)',
        /* v3 elevation system */
        'z-1': 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.4)',
        'z-2': 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.4)',
        'z-3': '0 24px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        'focus-blue': '0 0 0 2px #08090c, 0 0 0 4px #3b8bff',
        'focus-red':  '0 0 0 2px #08090c, 0 0 0 4px #ff3b3b',
      },
      transitionTimingFunction: {
        /* Motion vocabulary - only these four are allowed */
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        pop:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
        glide: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        enter: '280ms',
        pop:   '180ms',
        glide: '320ms',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'type-line': 'typeLine 0.3s ease forwards',
        'cursor-blink': 'blink 1s step-end infinite',
        'pulse-soft': 'pulseSoft 1.4s ease-in-out infinite',
        'tilt-in': 'tiltIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        typeLine: {
          from: { opacity: '0', transform: 'translateX(-4px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        tiltIn: {
          from: { opacity: '0', transform: 'perspective(800px) rotateX(-8deg) translateY(20px)' },
          to:   { opacity: '1', transform: 'perspective(800px) rotateX(0) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
