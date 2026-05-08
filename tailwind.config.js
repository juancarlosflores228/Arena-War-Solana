/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          bg:       '#080B10',
          surface:  '#0D1117',
          card:     '#111827',
          border:   '#1F2937',
          red:      '#E5202E',
          'red-dim':'#7B0D14',
          gold:     '#F5A623',
          'gold-dim':'#7A5214',
          cyan:     '#00D9FF',
          green:    '#00FF87',
          muted:    '#6B7280',
          text:     '#E5E7EB',
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'monospace'],
        body:    ['"DM Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(229,32,46,0.05) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(229,32,46,0.05) 1px, transparent 1px)`,
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(229,32,46,0.25) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-red': 'pulse-red 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan': 'scan 3s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(229,32,46,0.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(229,32,46,0)' },
        },
        'scan': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'red-glow':  '0 0 20px rgba(229,32,46,0.4), 0 0 40px rgba(229,32,46,0.1)',
        'gold-glow': '0 0 20px rgba(245,166,35,0.4), 0 0 40px rgba(245,166,35,0.1)',
        'cyan-glow': '0 0 20px rgba(0,217,255,0.3)',
        'card':      '0 4px 24px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
