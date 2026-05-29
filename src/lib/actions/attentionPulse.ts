/**
 * attentionPulse — Svelte action that rings a tile when its state changes.
 *
 * Usage:
 *   <div use:attentionPulse={{ count: pulseCount, color: '#30d158', radius: '20px' }}>
 *
 * Trigger by incrementing `count`. The ring color should be a raw hex string
 * (e.g. from tokens.raw.accent.*) — CSS variable strings won't work here
 * because we append hex-alpha suffixes for the glow.
 *
 * Animation phases:
 *   0–250 ms  : ring expands 1 px → 4 px, tile scales 1.0 → 1.02 → 1.0
 *   250–4250ms: ring holds with subtle glow
 *   4250–5050ms: ring fades to transparent
 */

import type { Action } from 'svelte/action';
import { dur, ease } from '$lib/design/motion.js';

export interface AttentionPulseParams {
  /** Increment to trigger; 0 = not yet triggered */
  count: number;
  /** Raw hex color, e.g. '#30d158' */
  color: string;
  /** Border-radius matching the host tile */
  radius: string;
}

export const attentionPulse: Action<HTMLElement, AttentionPulseParams> = (
  node,
  initialParams,
) => {
  let prevCount = initialParams.count;
  let ring: HTMLDivElement | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];

  function cleanupRing() {
    timers.forEach(clearTimeout);
    timers.length = 0;
    ring?.remove();
    ring = null;
    node.style.transform = '';
    node.style.transition = '';
  }

  function trigger(color: string, r: string) {
    cleanupRing();

    // Host must be positioned so the absolutely-placed ring stays inside it
    if (getComputedStyle(node).position === 'static') {
      node.style.position = 'relative';
    }

    // Build ring — sits flush over the host, no layout impact
    ring = document.createElement('div');
    Object.assign(ring.style, {
      position:      'absolute',
      inset:         '-1px',
      borderRadius:  r,
      pointerEvents: 'none',
      zIndex:        '10',
      // Start thin and transparent-glow
      boxShadow:  `0 0 0 1px ${color}, 0 0 0px ${color}00`,
      transition: `box-shadow ${dur.pulse}ms ${ease.apple}`,
    });
    node.appendChild(ring);

    // Phase 1 — expand ring + scale tile
    node.style.transition = `transform ${dur.pulse}ms ${ease.apple}`;
    node.style.transform   = 'scale(1.02)';

    // Force reflow so CSS transition fires from the initial state
    ring.getBoundingClientRect();
    ring.style.boxShadow = `0 0 0 4px ${color}, 0 0 20px ${color}50`;

    // Settle tile scale back
    timers.push(
      setTimeout(() => {
        node.style.transform = 'scale(1.0)';
      }, dur.pulse),
    );

    // Phase 3 — begin fade
    timers.push(
      setTimeout(() => {
        if (!ring) return;
        ring.style.transition = `box-shadow ${dur.fade}ms ${ease.apple}`;
        ring.style.boxShadow  = `0 0 0 4px ${color}00, 0 0 20px ${color}00`;
      }, dur.pulse + dur.hold),
    );

    // Cleanup
    timers.push(
      setTimeout(cleanupRing, dur.pulse + dur.hold + dur.fade + 100),
    );
  }

  if (initialParams.count > 0) {
    trigger(initialParams.color, initialParams.radius);
  }

  return {
    update(params: AttentionPulseParams) {
      if (params.count !== prevCount && params.count > 0) {
        prevCount = params.count;
        trigger(params.color, params.radius);
      } else {
        prevCount = params.count;
      }
    },
    destroy: cleanupRing,
  };
};
