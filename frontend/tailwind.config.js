/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f5f4f0',
          100: '#e8e6df',
          200: '#d1cec4',
          300: '#b5b0a4',
          400: '#958f81',
          500: '#7a7367',
          600: '#635d53',
          700: '#514b43',
          800: '#433e37',
          900: '#3a3630',
          950: '#1e1c18',
        },
        civic: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#c0d0ff',
          300: '#94b0ff',
          400: '#6285fb',
          500: '#3d5ff7',
          600: '#2a3fec',
          700: '#222fd9',
          800: '#2029af',
          900: '#1e2689',
          950: '#151854',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: '#dc2626',
        warn:   '#d97706',
        ok:     '#16a34a',
      },
      boxShadow: {
        'card':  '0 1px 3px 0 rgb(0 0 0 / 0.18), 0 1px 2px -1px rgb(0 0 0 / 0.12)',
        'card-hover': '0 8px 24px -4px rgb(0 0 0 / 0.22), 0 4px 8px -2px rgb(0 0 0 / 0.12)',
        'lift':  '0 20px 60px -12px rgb(0 0 0 / 0.35)',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
