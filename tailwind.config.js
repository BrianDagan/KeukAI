/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        keuka: {
          deep: '#0b3d5c',
          water: '#1f6f8b',
          vine: '#6b2d5c',
          leaf: '#3f7d20',
        },
      },
    },
  },
  plugins: [],
};
