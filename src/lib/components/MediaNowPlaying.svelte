<script lang="ts">
  /**
   * Home-tab compact Now Playing tile — Apple CarPlay / lock-screen style.
   *
   * Layout (right column, top to bottom):
   *   1. title-text  — title, artist·album, "Listening on X"
   *   2. prog-wrap   — progress bar + timestamps
   *   3. controls    — ⏮  ⏸/▶  ⏭  [airplay]
   *
   * Tapping the tile body → /music. Controls use stopPropagation.
   */
  import { goto }    from '$app/navigation';
  import { Music2, SkipBack, SkipForward, Play, Pause } from 'lucide-svelte';
  import CastPicker  from '$lib/components/music/CastPicker.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  interface Props { player: ResolvedPlayer | null; }
  let { player }: Props = $props();

  let isPlaying = $derived(player?.state === 'playing');
  let hasMedia  = $derived(!!(player?.media.title));
  let isActive  = $derived(!!player && player.state !== 'off' && player.state !== 'unavailable');
  let castOpen  = $state(false);

  function mp(service: string, extra: Record<string, unknown> = {}) {
    if (!player) return;
    callHaService('media_player', service, { entity_id: player.controlId, ...extra });
  }

  // ── Inline live progress ───────────────────────────────────────────────────
  let livePos = $state(player?.media.position ?? 0);
  let dragPos = $state<number | null>(null);
  let ticker: ReturnType<typeof setInterval>;
  let dragging = $state(false);

  $effect(() => {
    clearInterval(ticker);
    const pos = player?.media.position ?? null;
    const ref = player?.media.positionUpdatedAt ?? null;
    const cap = player?.media.duration ?? Infinity;
    if (isPlaying && pos != null && ref != null) {
      const tick = () => { livePos = Math.min(pos + (Date.now() - ref) / 1_000, cap); };
      tick();
      ticker = setInterval(tick, 1_000);
    } else {
      livePos = pos ?? 0;
    }
    return () => clearInterval(ticker);
  });

  let dur        = $derived(player?.media.duration ?? null);
  let displayPos = $derived(dragPos ?? livePos);
  let pct        = $derived(dur && dur > 0 ? Math.min(displayPos / dur, 1) * 100 : 0);
  let canSeek    = $derived(player?.caps.canSeek ?? false);

  function fmtElapsed(s: number): string {
    if (!isFinite(s) || s < 0) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }
  function fmtRemaining(pos: number, total: number): string {
    const rem = Math.max(0, total - pos);
    return `-${Math.floor(rem / 60)}:${Math.floor(rem % 60).toString().padStart(2, '0')}`;
  }

  // ── Seek drag ─────────────────────────────────────────────────────────────
  let barEl: HTMLElement | null = $state(null);

  function seekFrac(e: MouseEvent | TouchEvent): number {
    if (!barEl) return 0;
    const rect = barEl.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (x - rect.left) / rect.width));
  }
  function onBarDown(e: MouseEvent | TouchEvent) {
    if (!canSeek || !dur) return;
    e.stopPropagation();
    dragging = true;
    dragPos = seekFrac(e) * dur;
  }
  function onWindowMove(e: MouseEvent | TouchEvent) {
    if (!dragging || !dur) return;
    dragPos = seekFrac(e) * dur;
  }
  function onWindowUp() {
    if (!dragging) return;
    dragging = false;
    if (dragPos != null && dur) mp('media_seek', { seek_position: dragPos });
    dragPos = null;
  }
</script>

<svelte:window
  onmousemove={onWindowMove} onmouseup={onWindowUp}
  ontouchmove={onWindowMove} ontouchend={onWindowUp}
/>

<div class="now-playing">
  <div class="section-label">
    <Music2 size={13} strokeWidth={2} />
    <span>Now Playing</span>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="card" onclick={() => goto('/music')}>

    <!-- Artwork -->
    <div class="artwork" class:paused={!isPlaying && hasMedia}>
      {#if player?.media.artwork}
        <img src={player.media.artwork} alt="Album art" class="art-img" />
      {:else}
        <div class="art-ph"><Music2 strokeWidth={1.1} /></div>
      {/if}
    </div>

    <!-- Right column: title → progress → controls -->
    <div class="right">

      <!-- 1. Track info -->
      <div class="title-text">
        <p class="title" class:idle={!hasMedia}>
          {hasMedia ? (player!.media.title ?? '') : 'Nothing playing'}
        </p>
        <p class="sub">
          {#if hasMedia}
            {[player!.media.artist, player!.media.album].filter(Boolean).join(' · ')}
          {:else}
            Tap to open Music tab
          {/if}
        </p>
        {#if hasMedia && player?.name}
          <p class="listening-on">Listening on {player.name}</p>
        {/if}
      </div>

      <!-- 2. Progress bar + timestamps -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="prog-wrap"
        onclick={(e) => e.stopPropagation()}
        onmousedown={onBarDown}
        ontouchstart={onBarDown}
      >
        <div
          class="prog-track"
          bind:this={barEl}
          class:seekable={canSeek}
          class:dragging
        >
          <div class="prog-fill" style:width="{pct}%"></div>
          {#if canSeek && dragging}
            <div class="prog-thumb" style:left="{pct}%"></div>
          {/if}
        </div>
        <div class="prog-times">
          <span class="num">{fmtElapsed(displayPos)}</span>
          <span class="num">{dur != null ? fmtRemaining(displayPos, dur) : '–:––'}</span>
        </div>
      </div>

      <!-- 3. Transport + cast -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="controls"
        style:opacity={isActive ? '1' : '0.3'}
        style:pointer-events={isActive ? 'auto' : 'none'}
        onclick={(e) => e.stopPropagation()}
      >
        <button class="ctrl" aria-label="Previous"
          disabled={!(player?.caps.canPrevious)}
          onclick={() => mp('media_previous_track')}>
          <SkipBack size={26} strokeWidth={1.5} />
        </button>

        <button class="ctrl play" aria-label={isPlaying ? 'Pause' : 'Play'}
          onclick={() => mp(isPlaying ? 'media_pause' : 'media_play')}>
          {#if isPlaying}
            <Pause size={34} strokeWidth={1.8} />
          {:else}
            <Play  size={34} strokeWidth={1.8} />
          {/if}
        </button>

        <button class="ctrl" aria-label="Next"
          disabled={!(player?.caps.canNext)}
          onclick={() => mp('media_next_track')}>
          <SkipForward size={26} strokeWidth={1.5} />
        </button>

        <!-- AirPlay / cast — inline SVG -->
        <button class="ctrl airplay" class:open={castOpen}
          aria-label="Choose speaker"
          onclick={() => castOpen = true}>
          <span class="airplay-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 17L6.5 22H17.5L12 17Z" fill="currentColor"/>
              <path d="M5 19.5C3.1 18.1 2 16.1 2 14C2 9.6 6.5 6 12 6C17.5 6 22 9.6 22 14C22 16.1 20.9 18.1 19 19.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              <path d="M8 16.5C6.8 15.6 6 14.4 6 13C6 10.2 8.7 8 12 8C15.3 8 18 10.2 18 13C18 14.4 17.2 15.6 16 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            </svg>
          </span>
        </button>
      </div>

    </div>
  </div>
</div>

<CastPicker open={castOpen} onClose={() => castOpen = false} />

<style>
  .now-playing {
    height: 100%; display: flex; flex-direction: column; gap: 0.35rem;
  }

  .section-label {
    display: flex; align-items: center; gap: 5px;
    color: var(--color-text-tertiary); font-size: var(--type-label);
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0.2rem;
  }

  .card {
    flex: 1; min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px; border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: clamp(10px, 1.2vh, 16px) clamp(12px, 1.4vw, 20px);
    display: flex; align-items: center;
    gap: clamp(12px, 1.4vw, 18px);
    cursor: pointer;
    transition: background 200ms;
    user-select: none;
  }
  .card:active { background: var(--color-surface-2); }

  /* Artwork */
  .artwork {
    flex-shrink: 0;
    width:  clamp(72px, 9vw, 110px);
    height: clamp(72px, 9vw, 110px);
    border-radius: 12px; overflow: hidden;
    background: var(--color-surface-2);
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    transition: opacity 300ms ease, filter 300ms ease;
    align-self: center;
  }
  .artwork.paused { opacity: 0.5; filter: saturate(0.5); }
  .art-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .art-ph {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.28;
  }
  .art-ph :global(svg) { width: 40%; height: 40%; }

  /* Right column — title → progress → controls */
  .right {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
    gap: clamp(4px, 0.6vh, 8px);
    justify-content: center;
  }

  /* 1. Track info */
  .title-text { min-width: 0; }

  .title {
    font-size: clamp(18px, 1.9vw, 26px);
    font-weight: 700; letter-spacing: -0.015em; line-height: 1.2;
    color: var(--color-text-primary); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .title.idle { font-weight: 400; opacity: 0.5; }

  .sub {
    font-size: clamp(12px, 1.2vw, 17px);
    color: var(--color-text-secondary); margin: 0; opacity: 0.72;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.35;
  }

  .listening-on {
    font-size: clamp(11px, 0.97vw, 13px);
    color: var(--color-text-tertiary); margin: 0;
    opacity: 0.6; font-style: italic;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* 2. Progress bar */
  .prog-wrap {
    display: flex; flex-direction: column; gap: 3px;
    cursor: default; user-select: none;
  }
  .prog-track {
    position: relative; height: 4px; width: 100%;
    border-radius: 999px; background: var(--color-surface-2);
  }
  .prog-track.seekable { cursor: pointer; }
  .prog-track.dragging { cursor: grabbing; }
  .prog-fill {
    position: absolute; left: 0; top: 0; height: 100%;
    background: var(--color-accent-music); border-radius: 999px;
    pointer-events: none; transition: width 1s linear;
  }
  .prog-track.dragging .prog-fill { transition: none; }
  .prog-thumb {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 12px; height: 12px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4); pointer-events: none; z-index: 1;
  }
  .prog-times {
    display: flex; justify-content: space-between;
    font-size: clamp(11px, 0.9vw, 13px);
    color: var(--color-text-tertiary); opacity: 0.6;
  }

  /* 3. Controls row — full width, evenly spaced */
  .controls {
    display: flex; align-items: center;
    justify-content: space-around;
    width: 100%;
    transition: opacity 200ms;
  }

  .ctrl {
    display: flex; align-items: center; justify-content: center;
    border: none; background: none; cursor: pointer;
    color: var(--color-text-primary);
    padding: 4px; border-radius: 50%;
    transition: transform 130ms cubic-bezier(0.32,0.72,0,1), opacity 130ms;
    -webkit-tap-highlight-color: transparent;
  }
  .ctrl:disabled { opacity: 0.28; cursor: default; pointer-events: none; }
  .ctrl:not(:disabled):active { transform: scale(0.86); }
  .ctrl.play { padding: 3px; }

  /* AirPlay button */
  .ctrl.airplay {
    color: var(--color-accent-music); opacity: 0.72;
  }
  .ctrl.airplay.open { opacity: 1; }
  .ctrl.airplay:active { opacity: 1; }

  .airplay-icon {
    display: flex; align-items: center; justify-content: center;
  }
</style>
