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
        // Override slate colors to be darker and more visible
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#111827', // Changed from #0f172a to darker
          950: '#020617',
        },
        // Override gray colors for better consistency
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
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
