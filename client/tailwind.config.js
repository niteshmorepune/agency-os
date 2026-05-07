/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f0',
          100: '#d9f0d9',
          200: '#a8d9a8',
          300: '#6dc06d',
          400: '#3da63d',
          500: '#1a8a1a',
          600: '#1a6e1a',
          700: '#1a5c1a',
          800: '#1a472a',
          900: '#0d2b16',
        },
        accent: {
          50: '#fdf4f0',
          100: '#fae3d6',
          200: '#f5c2a2',
          300: '#ed9a6e',
          400: '#e2733f',
          500: '#c8522a',
          600: '#a83e1e',
          700: '#8a2e14',
          800: '#6b200c',
          900: '#4a1407',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
