import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // All brand colors come from CSS custom properties (set per theme).
      // We expose them as Tailwind utilities so components can use
      // `bg-brand`, `text-accent`, etc.
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          light: 'var(--color-brand-light)',
          dark: 'var(--color-brand-dark)',
        },
        accent: 'var(--color-accent)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
        },
        'on-surface': 'var(--color-on-surface)',
        'on-surface-muted': 'var(--color-on-surface-muted)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 4px 24px 0 rgba(0,0,0,0.08)',
        'card-hover': '0 8px 32px 0 rgba(0,0,0,0.14)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
