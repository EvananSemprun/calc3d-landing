/** @type {import('tailwindcss').Config} */
// Marca "panel de precisión" calcada de apps/web (paleta ESTRICTA de 5 colores).
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Hanken Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Hanken Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        success: 'hsl(var(--success))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          blue: 'hsl(var(--brand-blue))',
          yellow: 'hsl(var(--brand-yellow))',
          'yellow-hover': 'hsl(var(--brand-yellow-hover))',
          'yellow-foreground': 'hsl(var(--brand-yellow-foreground))',
          'yellow-ink': 'hsl(var(--brand-yellow-ink))',
        },
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 8px)',
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
      },
      boxShadow: {
        glow: '0 0 0 1px hsl(var(--brand-yellow) / 0.35), 0 8px 30px -8px hsl(var(--brand-yellow) / 0.25)',
        'glow-lg': '0 0 0 1px hsl(var(--brand-yellow) / 0.4), 0 12px 48px -8px hsl(var(--brand-yellow) / 0.35)',
        'glow-blue': '0 0 0 1px hsl(var(--brand-blue) / 0.5), 0 10px 40px -10px hsl(var(--brand-blue) / 0.55)',
      },
      backgroundImage: {
        'gold-sheen':
          'linear-gradient(110deg, hsl(var(--brand-yellow)) 0%, hsl(var(--brand-yellow-hover)) 35%, hsl(0 0% 100% / 0.9) 50%, hsl(var(--brand-yellow-hover)) 65%, hsl(var(--brand-yellow)) 100%)',
      },
      keyframes: {
        shine: {
          '0%': { 'background-position': '200% center' },
          '100%': { 'background-position': '-200% center' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shine: 'shine 6s linear infinite',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
