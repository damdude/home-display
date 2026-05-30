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
    climate:   '#D7906A',
    safe:      '#6B9B7D',  // sage  — closed doors, disarmed security
    alert:     '#A89876',  // wheat — open doors (warm, not alarming)
    triggered: '#C66B6B',  // deep red — armed security, triggered alarm
    info:      '#6B8FB5',
    music:     '#9B7BB5',
    light:     '#C4A572',
    neutral:   '#8E8E93',
  },
  // Per-condition colors for WeatherIcon — avoids relying on a single accent
  weather: {
    sunny:       '#E6C547',  // warm yellow
    partlyCloudy:'#C8B84A',  // muted yellow (sun side)
    cloudy:      '#8B9DAD',  // cool grey-blue
    rainy:       '#6B8FA8',  // deeper blue-grey
    snowy:       '#A8C4D4',  // light blue-white
    night:       '#7B8FB5',  // muted indigo
    fog:         '#9CA3A7',  // neutral pale grey (lighter than cloudy)
  },
} as const;

// CSS variable references — for style="" bindings
export const cv = {
  bg: {
    canvas:    'var(--color-canvas)',
    surface1:  'var(--color-surface-1)',
    surface2:  'var(--color-surface-2)',
    surface3:  'var(--color-surface-3)',
    highlight: 'var(--color-highlight)',
  },
  border: 'var(--color-border)',
  accent: {
    climate:   'var(--color-accent-climate)',
    safe:      'var(--color-accent-safe)',
    alert:     'var(--color-accent-alert)',
    triggered: 'var(--color-accent-triggered)',
    info:      'var(--color-accent-info)',
    music:     'var(--color-accent-music)',
    light:     'var(--color-accent-light)',
    neutral:   'var(--color-accent-neutral)',
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
  clock:    'var(--type-clock)',
  temp:     'var(--type-temp)',
  hero:     'var(--type-hero)',
  h1:       'var(--type-h1)',
  h2:       'var(--type-h2)',
  body:     'var(--type-body)',
  caption:  'var(--type-caption)',
  label:    'var(--type-label)',
} as const;
