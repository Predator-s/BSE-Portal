/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — Butter + Deep Green.
        butter: {
          DEFAULT: '#ffefb3',
          50: '#fffdf5',
          100: '#fffae6',
          200: '#fff3c9',
          300: '#ffefb3',
          400: '#ffe27a',
          500: '#f5cf4d',
        },
        forest: {
          DEFAULT: '#013e37',
          50: '#e9f2f0',
          100: '#cfe0dd',
          200: '#9ec2bc',
          300: '#5f8a83',
          600: '#024a41',
          700: '#013e37',
          800: '#01302b',
          900: '#01211d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(1, 62, 55, 0.08), 0 8px 24px rgba(1, 62, 55, 0.06)',
      },
    },
  },
  plugins: [],
};
