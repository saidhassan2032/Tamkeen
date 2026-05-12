import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Map to CSS variables — single source of truth lives in globals.css
        bg:        'hsl(var(--bg))',
        surface:   'hsl(var(--surface))',
        surface2:  'hsl(var(--surface-2))',
        border:    'hsl(var(--border))',
        input:     'hsl(var(--input))',
        ring:      'hsl(var(--ring))',
        foreground: 'hsl(var(--text))',
        background: 'hsl(var(--bg))',

        text: {
          DEFAULT:   'hsl(var(--text))',
          secondary: 'hsl(var(--text-2))',
          muted:     'hsl(var(--text-muted))',
        },

        brand: {
          DEFAULT: 'hsl(var(--brand))',
          fg:      'hsl(var(--brand-fg))',
          soft:    'hsl(var(--brand-soft))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          fg:      'hsl(var(--accent-fg))',
          soft:    'hsl(var(--accent-soft))',
        },

        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger:  'hsl(var(--danger))',

        // shadcn primitive aliases (so existing primitives keep working)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Legacy alias — keep until all references are migrated
        tamkeen: {
          bg:       'hsl(var(--bg))',
          surface:  'hsl(var(--surface))',
          surface2: 'hsl(var(--surface-2))',
          border:   'hsl(var(--border))',
          text:     'hsl(var(--text))',
          muted:    'hsl(var(--text-muted))',
          blue:     'hsl(var(--brand))',
          green:    'hsl(var(--success))',
          amber:    'hsl(var(--warning))',
          red:      'hsl(var(--danger))',
          gold:     'hsl(var(--accent))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-arabic)', 'IBM Plex Sans Arabic', 'Cairo', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px hsl(var(--text) / 0.04), 0 4px 16px hsl(var(--text) / 0.04)',
        glow: '0 0 0 1px hsl(var(--brand) / 0.15), 0 8px 24px hsl(var(--brand) / 0.12)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
