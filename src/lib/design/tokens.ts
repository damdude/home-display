/**
 * Design tokens — single source of truth for all visual constants.
 *
 * `cv` exports CSS variable references (use in style="" attributes).
 * `raw` exports raw hex/string values (use in JS logic, e.g. pulse ring colors).
 * Never use inline colors, sizes, or motion timings in components.
 */

// Raw values — for JS logic that needs real color strings
export const raw = {
  accent: {
    orange: '#ff9f0a',
    green:  '#30d158',
    red:    '#ff453a',
    blue:   '#0a84ff',
    yellow: '#ffd60a',
    purple: '#bf5af2',
  },
} as const;

// CSS variable references — for style="" bindings
export const cv = {
  bg: {
    canvas:    'var(--color-canvas)',
    surface1:  'var(--color-surface-1)',
    surface2:  'var(--color-surface-2)',
    highlight: 'var(--color-highlight)',
  },
  border: 'var(--color-border)',
  accent: {
    orange: 'var(--color-accent-orange)',
    green:  'var(--color-accent-green)',
    red:    'var(--color-accent-red)',
    blue:   'var(--color-accent-blue)',
    yellow: 'var(--color-accent-yellow)',
    purple: 'var(--color-accent-purple)',
  },
  text: {
    primary:   'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary:  'var(--color-text-tertiary)',
  },
} as const;

// Border radii
export const radius = {
  tile:  '28px',
  small: '20px',
  pill:  '999px',
  round: '50%',
} as const;

// Type scale — use CSS variable names, defined in app.css
export const type = {
  clock:   'var(--type-clock)',
  temp:    'var(--type-temp)',
  h1:      'var(--type-h1)',
  h2:      'var(--type-h2)',
  body:    'var(--type-body)',
  caption: 'var(--type-caption)',
} as const;
