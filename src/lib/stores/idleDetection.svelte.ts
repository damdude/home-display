/**
 * Idle detection store.
 *
 * Tracks whether the user has been inactive for IDLE_TIMEOUT_MS.
 * The screensaver in +layout.svelte reads idleState.isIdle.
 *
 * Usage:
 *   onMount(() => startIdleDetection());
 *   — registers mouse/touch/key listeners and starts the timer.
 *   — returns a cleanup function for onDestroy.
 */

import { browser } from '$app/environment';
import { IDLE_TIMEOUT_MS } from '$lib/design/tokens.js';

let _isIdle = $state(false);

export const idleState = {
  get isIdle(): boolean { return _isIdle; },
};

export function startIdleDetection(): () => void {
  if (!browser) return () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset() {
    _isIdle = false;
    clearTimeout(timer);
    timer = setTimeout(() => { _isIdle = true; }, IDLE_TIMEOUT_MS);
  }

  const EVENTS = ['mousemove', 'touchstart', 'click', 'keydown'] as const;
  const opts   = { passive: true };
  for (const ev of EVENTS) window.addEventListener(ev, reset, opts);

  reset(); // Prime the timer immediately

  return () => {
    for (const ev of EVENTS) window.removeEventListener(ev, reset);
    clearTimeout(timer);
    _isIdle = false;
  };
}
