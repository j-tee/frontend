/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#2563eb',
          secondary: '#1d4ed8',
          accent: '#7c3aed',
        },
        midnight: '#0b1220',
      },
      boxShadow: {
        card: '0 20px 45px rgba(15, 23, 42, 0.12)',
        glow: '0 25px 50px -12px rgba(124, 58, 237, 0.45)',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at top right, rgba(124, 58, 237, 0.25), transparent 55%)',
        'hero-grid':
          'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.08) 45%, rgba(16, 24, 40, 0.85) 100%)',
      },
      borderRadius: {
        '4xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

