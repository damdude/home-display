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

/**
 * JS function form of ease.apple, for Svelte's JS-driven transitions
 * (fly, fade, etc.) whose `easing` param takes a function, not a CSS
 * string. Solved via Newton-Raphson, same approach the CSS engine itself
 * uses to evaluate cubic-bezier() curves.
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (p1: number, p2: number) => 1 - 3 * p2 + 3 * p1;
  const b = (p1: number, p2: number) => 3 * p2 - 6 * p1;
  const c = (p1: number) => 3 * p1;

  const sampleX = (t: number) => ((a(x1, x2) * t + b(x1, x2)) * t + c(x1)) * t;
  const sampleY = (t: number) => ((a(y1, y2) * t + b(y1, y2)) * t + c(y1)) * t;
  const sampleXDerivative = (t: number) => (3 * a(x1, x2) * t + 2 * b(x1, x2)) * t + c(x1);

  function solveX(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const d = sampleXDerivative(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const xAtT = sampleX(t);
      if (Math.abs(xAtT - x) < 1e-6) return t;
      if (x > xAtT) lo = t; else hi = t;
      t = (hi + lo) / 2;
    }
    return t;
  }

  return (t: number) => sampleY(solveX(t));
}

/** JS equivalent of ease.apple — pass as `easing` to fly/fade/scale, etc. */
export const easeApple = cubicBezier(0.32, 0.72, 0, 1);
