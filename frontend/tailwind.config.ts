import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f7f4ef',
          muted: '#f0ede6',
          subtle: '#eae6dc',
          pure: '#ffffff'
        },
        ink: {
          DEFAULT: '#10100F',
          pure: '#10100F',
          muted: '#524f4a',
          subtle: '#8c887f',
          faint: '#b8b4ab'
        },
        accent: {
          DEFAULT: '#a8462d',
          dark: '#8a3a25',
          light: '#f3e2da',
          vibrant: '#d94426',
          pine: '#1b3b2b',
          cobalt: '#1e3a8a'
        },
        line: {
          DEFAULT: '#e5ded2',
          subtle: '#efeae0',
          dark: '#c8bfb0'
        }
      },
      fontFamily: {
        heading: ['EuropaGroNr2SH', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['EuropaGroNr2SH', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(33, 31, 27, 0.04), 0 1px 8px rgba(33, 31, 27, 0.04)',
        drawer: '-8px 0 32px rgba(0, 0, 0, 0.12)',
        float: '0 12px 36px -4px rgba(33, 31, 27, 0.12)',
        subtle: '0 1px 3px rgba(33, 31, 27, 0.06)'
      },
      animation: {
        'marquee': 'marquee 28s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        // Hanging garment rail: drops onto the rail on load, sways gently and continuously at rest, and
        // swings harder on hover.
        'hang': 'hang 2.2s linear both',
        'sway': 'sway 5s ease-in-out infinite',
        'swing': 'swing 0.8s ease-out'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        // Falls from above (0-19%) with its own easing, then a densely-sampled damped-pendulum swing carries it
        // the rest of the way to rest -- close enough steps that linear interpolation between them reads as a
        // smooth curve. (The source had two "23.18%" entries; in a JS object the later one silently wins and the
        // earlier is dead code, so only the surviving values are kept here.)
        hang: {
          '0%': { transform: 'translateY(-55vh) rotate(-3deg)', opacity: '0', animationTimingFunction: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
          '3.18%': { opacity: '1' },
          '19.09%': { transform: 'translateY(0) rotate(0deg)', animationTimingFunction: 'ease-out' },
          '23.18%': { transform: 'translateY(5.0px) rotate(0.00deg)' },
          '25.91%': { transform: 'translateY(2.4px) rotate(5.49deg)' },
          '28.64%': { transform: 'translateY(1.1px) rotate(8.53deg)' },
          '31.36%': { transform: 'translateY(0.5px) rotate(8.56deg)' },
          '34.09%': { transform: 'translateY(0.2px) rotate(6.04deg)' },
          '36.82%': { transform: 'translateY(0.1px) rotate(2.08deg)' },
          '39.55%': { transform: 'translateY(0.1px) rotate(-1.92deg)' },
          '42.27%': { transform: 'translateY(0.0px) rotate(-4.75deg)' },
          '45.0%': { transform: 'translateY(0.0px) rotate(-5.74deg)' },
          '47.73%': { transform: 'translateY(0.0px) rotate(-4.87deg)' },
          '50.45%': { transform: 'translateY(0.0px) rotate(-2.67deg)' },
          '53.18%': { transform: 'translateY(0.0px) rotate(0.00deg)' },
          '55.91%': { transform: 'translateY(0.0px) rotate(2.28deg)' },
          '58.64%': { transform: 'translateY(0.0px) rotate(3.54deg)' },
          '61.36%': { transform: 'translateY(0.0px) rotate(3.55deg)' },
          '64.09%': { transform: 'translateY(0.0px) rotate(2.50deg)' },
          '66.82%': { transform: 'translateY(0.0px) rotate(0.86deg)' },
          '69.55%': { transform: 'translateY(0.0px) rotate(-0.80deg)' },
          '72.27%': { transform: 'translateY(0.0px) rotate(-1.97deg)' },
          '75.0%': { transform: 'translateY(0.0px) rotate(-2.38deg)' },
          '77.73%': { transform: 'translateY(0.0px) rotate(-2.02deg)' },
          '80.45%': { transform: 'translateY(0.0px) rotate(-1.11deg)' },
          '83.18%': { transform: 'translateY(0.0px) rotate(0.00deg)' },
          '85.91%': { transform: 'translateY(0.0px) rotate(0.94deg)' },
          '88.64%': { transform: 'translateY(0.0px) rotate(1.47deg)' },
          '91.36%': { transform: 'translateY(0.0px) rotate(1.47deg)' },
          '94.09%': { transform: 'translateY(0.0px) rotate(1.04deg)' },
          '96.82%': { transform: 'translateY(0.0px) rotate(0.36deg)' },
          '100%': { transform: 'translateY(0) rotate(0deg)' }
        },
        swing: {
          '0%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(6deg)' },
          '40%': { transform: 'rotate(-4deg)' },
          '60%': { transform: 'rotate(2.5deg)' },
          '80%': { transform: 'rotate(-1deg)' },
          '100%': { transform: 'rotate(0deg)' }
        },
        // Small idle drift, like a garment settling on a rail never quite stopping. Kept subtle (a couple
        // degrees) so it reads as ambient life rather than a distraction.
        sway: {
          '0%, 100%': { transform: 'rotate(-1.75deg)' },
          '50%': { transform: 'rotate(1.75deg)' }
        }
      }
    }
  },
  plugins: []
};

export default config;

