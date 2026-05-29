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
  breathe:  2000,  // one breathing-ring cycle (opacity in+out)
  breatheRepeat: 2, // number of breathing cycles before fade
  fade:     600,   // attention ring fade out
} as const;
