/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e5f3fb',
          100: '#cce4f7',
          200: '#99c9ef',
          300: '#66aee7',
          500: '#0078D4',
          600: '#0067b8',
          700: '#005a9e',
          900: '#003a6e',
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.08)',
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
    },
  },
  plugins: [],
};
