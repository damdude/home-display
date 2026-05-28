export const colors = {
  background: {
    primary: '#1C1C1E',
    secondary: '#2C2C2E',
    tertiary: '#3A3A3C',
    elevated: '#2C2C2E',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  label: {
    primary: '#FFFFFF',
    secondary: 'rgba(235, 235, 245, 0.60)',
    tertiary: 'rgba(235, 235, 245, 0.30)',
    quaternary: 'rgba(235, 235, 245, 0.18)',
  },
  fill: {
    primary: 'rgba(120, 120, 128, 0.36)',
    secondary: 'rgba(120, 120, 128, 0.32)',
    tertiary: 'rgba(118, 118, 128, 0.24)',
    quaternary: 'rgba(116, 116, 128, 0.18)',
  },
  separator: 'rgba(84, 84, 88, 0.65)',
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
} as const;

// clamp(min, preferred-vw, max) — scales between 800px and 1440px viewport width
export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
    mono: '"SF Mono", "Fira Code", Menlo, monospace',
  },
  fontSize: {
    xs: 'clamp(0.625rem, 1.0vw, 0.75rem)',
    sm: 'clamp(0.75rem, 1.2vw, 0.875rem)',
    base: 'clamp(0.875rem, 1.4vw, 1rem)',
    lg: 'clamp(1rem, 1.8vw, 1.25rem)',
    xl: 'clamp(1.25rem, 2.5vw, 1.75rem)',
    '2xl': 'clamp(1.5rem, 3.5vw, 2.25rem)',
    '3xl': 'clamp(2rem, 5vw, 3rem)',
    '4xl': 'clamp(2.5rem, 6.5vw, 4rem)',
  },
} as const;

export const spacing = {
  xs: '0.5rem',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
  xxl: '4rem',
  xxxl: '6rem',
} as const;

export const radius = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1.25rem',
  xl: '2rem',
  full: '9999px',
} as const;

export const motion = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;
