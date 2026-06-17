/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F0',
          100: '#FFE8DC',
          200: '#FFD1B8',
          300: '#FFB08A',
          400: '#FF8A5C',
          500: '#FF6B35',
          600: '#F05521',
          700: '#C94316',
          800: '#A13612',
          900: '#7A2A0E',
        },
        secondary: {
          50: '#F0FBFA',
          100: '#D4F4F1',
          200: '#A9E9E3',
          300: '#7DDDD4',
          400: '#52D1C6',
          500: '#2EC4B6',
          600: '#25A094',
          700: '#1C7C72',
          800: '#135851',
          900: '#0A3430',
        },
        accent: {
          500: '#FF8FA3',
        },
        neutral: {
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#868E96',
          700: '#636E72',
          800: '#2D3436',
          900: '#1A1C1D',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
