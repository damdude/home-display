/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1C1C1E',
          secondary: '#2C2C2E',
          tertiary: '#3A3A3C',
          elevated: '#2C2C2E',
        },
        accent: {
          blue: '#0A84FF',
          green: '#30D158',
          red: '#FF453A',
          orange: '#FF9F0A',
          yellow: '#FFD60A',
          purple: '#BF5AF2',
          teal: '#40CBE0',
          indigo: '#5E5CE6',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '0.75rem',
        lg: '1.25rem',
        xl: '2rem',
      },
    },
  },
  plugins: [],
};
