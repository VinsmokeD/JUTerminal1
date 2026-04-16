/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── The Duality Palette ─────────────────────────── */
        'cs-red': {
          DEFAULT: '#ff3b3b',
          glow: '#ff3b3b40',
          dim: '#ff3b3b15',
          surface: '#1a0808',
        },
        'cs-blue': {
          DEFAULT: '#3b8bff',
          glow: '#3b8bff40',
          dim: '#3b8bff15',
          surface: '#080d1a',
        },
        /* ── Neutrals ───────────────────────────────────── */
        void: '#08090c',
        'surface-1': '#0d0f14',
        'surface-2': '#13161d',
        'surface-3': '#1a1d26',
        'surface-4': '#22262f',
        'cs-border': '#1e2230',
        'cs-border-glow': '#2a2f40',
        /* ── Text ───────────────────────────────────────── */
        'txt-primary': '#e8eaf0',
        'txt-secondary': '#8890a4',
        'txt-dim': '#4a5068',
        /* ── Accents ────────────────────────────────────── */
        'green-signal': '#00ff88',
        'amber-warn': '#ffaa00',
        critical: '#ff2244',
      },
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        cs: '10px',
        'cs-sm': '6px',
        'cs-lg': '16px',
      },
      boxShadow: {
        'red-glow': '0 4px 24px #ff3b3b40, inset 0 1px 0 rgba(255,255,255,0.15)',
        'blue-glow': '0 4px 24px #3b8bff40, inset 0 1px 0 rgba(255,255,255,0.15)',
        'red-hover': '0 8px 40px rgba(255,59,59,0.5)',
        'blue-hover': '0 8px 40px rgba(59,139,255,0.5)',
        'card-hover': '0 20px 60px -12px rgba(0,0,0,0.5)',
        'demo-frame': '0 24px 80px -12px rgba(0,0,0,0.6), 0 0 120px -40px rgba(59,139,255,0.08)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease both',
        'slide-in': 'slideIn 0.4s ease forwards',
        'type-line': 'typeLine 0.3s ease forwards',
        'cursor-blink': 'blink 1s step-end infinite',
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
      },
    },
  },
  plugins: [],
}
