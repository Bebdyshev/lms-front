
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe8ff',
          200: '#b7d1ff',
          300: '#93baff',
          400: '#6fa3ff',
          500: '#4b8cff',
          600: '#2f6fe6',
          700: '#2356b4',
          800: '#1b428a',
          900: '#142f61',
        }
      },
      boxShadow: {
        card: '0 8px 24px rgba(16, 24, 40, 0.08)'
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px'
      }
    },
  },
  plugins: [],
} 