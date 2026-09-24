import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f7f4ef',
        ink: '#211f1b',
        accent: {
          DEFAULT: '#a8462d',
          dark: '#8a3a25',
          light: '#f3e2da'
        },
        line: '#e5ded2'
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(33, 31, 27, 0.04), 0 1px 8px rgba(33, 31, 27, 0.04)'
      }
    }
  },
  plugins: []
};

export default config;
