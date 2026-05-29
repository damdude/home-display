/**
 * attentionPulse — Svelte action that rings a tile when its state changes.
 *
 * Usage:
 *   <div use:attentionPulse={{ count: pulseCount, color: '#6b9b7d', radius: '28px' }}>
 *
 * Trigger by incrementing `count`. The ring color should be a raw hex string
 * (e.g. from tokens.raw.accent.*) — CSS variable strings won't work here
 * because we build box-shadow values directly.
 *
 * Animation phases:
 *   0 – breathe×N ms : 1.5px ring breathes opacity 0.4 → 0.8 → 0.4, N times
 *   breathe×N ms     : ring fades out over 600 ms
 *   Total ≈ 4.6 s (2 cycles × 2 s + 0.6 s fade)
 *
 * No tile scale, no background color change.
 */

import type { Action } from 'svelte/action';
import { dur, ease } from '$lib/design/motion.js';

export interface AttentionPulseParams {
  /** Increment to trigger; 0 = not yet triggered */
  count: number;
  /** Raw hex color, e.g. '#6b9b7d' */
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
  let animation: Animation | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];

  function cleanupRing() {
    timers.forEach(clearTimeout);
    timers.length = 0;
    animation?.cancel();
    animation = null;
    ring?.remove();
    ring = null;
  }

  function trigger(color: string, r: string) {
    cleanupRing();

    // Host must be positioned so the absolutely-placed ring stays inside it
    if (getComputedStyle(node).position === 'static') {
      node.style.position = 'relative';
    }

    // Build ring — sits flush over the host, pointer-events transparent
    ring = document.createElement('div');
    Object.assign(ring.style, {
      position:      'absolute',
      inset:         '-2px',
      borderRadius:  r,
      pointerEvents: 'none',
      zIndex:        '10',
      boxShadow:     `0 0 0 1.5px ${color}`,
      opacity:       '0',
    });
    node.appendChild(ring);

    const totalBreathMs = dur.breathe * dur.breatheRepeat;

    // Breathing keyframes: opacity 0 → 0.4 → 0.8 → 0.4 → 0 (smooth in-out, repeated)
    // We run one keyframe set per cycle
    const breatheKeyframes: Keyframe[] = [
      { opacity: '0.4', offset: 0 },
      { opacity: '0.8', offset: 0.5 },
      { opacity: '0.4', offset: 1 },
    ];

    animation = ring.animate(breatheKeyframes, {
      duration:   dur.breathe,
      iterations: dur.breatheRepeat,
      easing:     'ease-in-out',
      fill:       'forwards',
    });

    // After all cycles complete, fade ring to invisible then remove
    timers.push(
      setTimeout(() => {
        if (!ring) return;
        animation?.cancel();
        animation = null;
        ring.style.transition = `opacity ${dur.fade}ms ${ease.apple}`;
        ring.style.opacity    = '0';
      }, totalBreathMs),
    );

    timers.push(
      setTimeout(cleanupRing, totalBreathMs + dur.fade + 50),
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
