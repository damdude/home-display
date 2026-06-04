<script lang="ts">
  interface Props {
    position:          number | null;
    duration:          number | null;
    positionUpdatedAt: number | null;
    playbackState:     string;
    canSeek:           boolean;
    large?:            boolean;
    onSeek?:           (seconds: number) => void;
  }
  let {
    position, duration, positionUpdatedAt, playbackState,
    canSeek, large = false, onSeek,
  }: Props = $props();

  // ── Live position ─────────────────────────────────────────────────────────
  let livePos = $state(position ?? 0);
  let ticker: ReturnType<typeof setInterval>;

  $effect(() => {
    clearInterval(ticker);
    if (playbackState === 'playing' && position != null && positionUpdatedAt != null) {
      const p = position, ref = positionUpdatedAt, cap = duration ?? Infinity;
      const tick = () => { livePos = Math.min(p + (Date.now() - ref) / 1000, cap); };
      tick();
      ticker = setInterval(tick, 1_000);
    } else {
      livePos = position ?? 0;
    }
    return () => clearInterval(ticker);
  });

  let pct = $derived(duration && duration > 0 ? Math.min(livePos / duration, 1) * 100 : 0);

  function fmt(s: number): string {
    if (!isFinite(s) || s < 0) return '–:––';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  // ── Seek ─────────────────────────────────────────────────────────────────
  let barEl: HTMLElement | null = $state(null);
  let dragging = $state(false);

  function seekFromEvent(e: MouseEvent | TouchEvent) {
    if (!canSeek || !barEl || !duration) return;
    const rect = barEl.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const frac = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    onSeek?.(frac * duration);
  }
  function onPointerDown(e: MouseEvent | TouchEvent) { if (!canSeek) return; dragging = true; seekFromEvent(e); }
  function onPointerMove(e: MouseEvent | TouchEvent) { if (dragging) seekFromEvent(e); }
  function onPointerUp() { dragging = false; }
</script>

<svelte:window
  onmousemove={onPointerMove} onmouseup={onPointerUp}
  ontouchmove={onPointerMove} ontouchend={onPointerUp}
/>

<div class="wrap" class:large>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="bar"
    bind:this={barEl}
    class:seekable={canSeek}
    onmousedown={onPointerDown}
    ontouchstart={onPointerDown}
  >
    <!-- Unfilled track sits behind everything -->
    <div class="track"></div>
    <!-- Filled portion -->
    <div class="fill" style:width="{pct}%"></div>
    <!-- Thumb — always rendered when seekable, not just on drag -->
    {#if canSeek}
      <div class="thumb" style:left="{pct}%"></div>
    {/if}
  </div>
  <div class="times">
    <span class="num">{fmt(livePos)}</span>
    <span class="num">{duration != null ? fmt(duration) : '–:––'}</span>
  </div>
</div>

<style>
  .wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; user-select: none; }

  /* Bar is a positioning context with no overflow clipping */
  .bar {
    position: relative;
    width: 100%;
    height: 8px;
    border-radius: 999px;
  }
  .bar.seekable { cursor: pointer; }
  .large .bar   { height: 12px; }

  /* Unfilled track — fills the entire bar */
  .track {
    position: absolute; inset: 0;
    background: var(--color-surface-2);
    border-radius: 999px;
  }

  /* Filled portion — on top of track */
  .fill {
    position: absolute; left: 0; top: 0; height: 100%;
    background: var(--color-accent-music);
    border-radius: 999px;
    transition: width 1s linear;
    pointer-events: none;
  }

  /* Thumb — sits on top of both layers, slightly larger than bar height */
  .thumb {
    position: absolute;
    top: 50%; transform: translate(-50%, -50%);
    width: 12px; height: 12px;
    border-radius: 50%;
    background: var(--color-accent-music);
    box-shadow: 0 0 0 3px rgba(155, 123, 181, 0.25);
    pointer-events: none;
    z-index: 1;
  }
  .large .thumb { width: 16px; height: 16px; }

  .times {
    display: flex; justify-content: space-between;
    font-size: clamp(12px, 1.04vw, 15px);
    color: var(--color-text-tertiary); opacity: 0.7;
  }
  .large .times { font-size: clamp(15px, 1.39vw, 20px); }
</style>
