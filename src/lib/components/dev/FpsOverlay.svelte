<script lang="ts">
  /**
   * Dev-only FPS + frame-time overlay. Enable with ?fps=1 (persists in
   * sessionStorage); disable with ?fps=0. Shows current FPS, 1% low over the
   * last 5s, and the count of long frames (>16.7ms) in that window.
   *
   * Zero cost when disabled: no rAF loop starts and nothing renders.
   */
  import { onMount } from 'svelte';

  let enabled    = $state(false);
  let fps        = $state(0);
  let low1       = $state(0);
  let longFrames = $state(0);

  onMount(() => {
    try {
      const p = new URLSearchParams(location.search);
      if (p.has('fps')) {
        const v = p.get('fps');
        if (v === '0' || v === 'false') sessionStorage.removeItem('dashboard.fps');
        else sessionStorage.setItem('dashboard.fps', '1');
      }
      enabled = sessionStorage.getItem('dashboard.fps') === '1';
    } catch { /* ignore */ }
    if (!enabled) return;   // ← nothing below runs when disabled

    const durs:  number[] = [];   // frame durations (ms), last 5s
    const stamps: number[] = [];  // matching timestamps
    let last = performance.now();
    let acc = 0, accCount = 0;
    let raf = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      durs.push(dt); stamps.push(now);
      while (stamps.length && now - stamps[0] > 5000) { stamps.shift(); durs.shift(); }
      acc += dt; accCount++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Refresh the readout 2×/s so the overlay itself doesn't churn every frame.
    const displayTimer = window.setInterval(() => {
      if (accCount > 0) { fps = Math.round(1000 / (acc / accCount)); acc = 0; accCount = 0; }
      if (durs.length > 5) {
        const sorted = [...durs].sort((a, b) => a - b);
        const worst  = sorted[Math.min(Math.floor(sorted.length * 0.99), sorted.length - 1)];
        low1       = Math.round(1000 / worst);          // 1% low, expressed as FPS
        longFrames = durs.filter(d => d > 16.7).length; // dropped/long frames in window
      }
    }, 500);

    return () => { cancelAnimationFrame(raf); clearInterval(displayTimer); };
  });
</script>

{#if enabled}
  <div class="fps-overlay">
    <span>{fps}fps</span>
    <span class:warn={low1 < 55}>1%·{low1}</span>
    <span class:warn={longFrames > 0}>lng·{longFrames}</span>
  </div>
{/if}

<style>
  .fps-overlay {
    position: fixed;
    top: 4px; left: 4px;
    z-index: 99999;
    display: flex; gap: 8px;
    font: 600 11px/1.3 ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    color: #35ff6a;
    background: rgba(0, 0, 0, 0.62);
    padding: 3px 7px;
    border-radius: 5px;
    pointer-events: none;
    white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .fps-overlay .warn { color: #ffcf3f; }
</style>
