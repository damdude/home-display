/**
 * Motion constants — all animation timings and easing curves.
 * Never write timing values or cubic-bezier strings inline in components.
 */

export const ease = {
  /** Apple's standard easing — used for nearly all transitions */
  apple: 'cubic-bezier(0.32, 0.72, 0, 1)',
  /** Decelerate (elements entering) */
  out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
} as const;

export const dur = {
  fast:     200,   // micro-interactions (button press)
  standard: 300,   // most transitions
  slow:     500,   // large layout changes
  pulse:    250,   // attention ring expand + tile scale
  hold:     4000,  // attention ring visible hold duration
  fade:     800,   // attention ring fade out
} as const;
