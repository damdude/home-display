<script lang="ts">
  /**
   * Home-tab compact Now Playing tile — Apple CarPlay / lock-screen style.
   *
   * Layout:
   *   [artwork] | [title          ⏮ ⏸ ⏭ ✈]
   *             | [artist • album         ]
   *             | [====progress bar=======]
   *             | [0:47             -2:13 ]
   *
   * Tapping the tile body (not controls) → navigate to /music.
   * Airplay icon opens the shared CastPicker sheet.
   */
  import { goto }   from '$app/navigation';
  import { Music2, SkipBack, SkipForward, Play, Pause, Airplay } from 'lucide-svelte';
  import CastPicker from '$lib/components/music/CastPicker.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }   from '$lib/stores/musicState.svelte.js';

  interface Props {
    player: ResolvedPlayer | null;
  }
  let { player }: Props = $props();

  let isPlaying  = $derived(player?.state === 'playing');
  let hasMedia   = $derived(!!(player?.media.title));
  let isActive   = $derived(!!player && player.state !== 'off' && player.state !== 'unavailable');
  let castOpen   = $state(false);

  // ── Service calls ─────────────────────────────────────────────────────────
  function mp(service: string, extra: Record<string, unknown> = {}) {
    if (!player) return;
    callHaService('media_player', service, { entity_id: player.controlId, ...extra });
  }

  // ── Inline live progress (CarPlay height: 4px) ────────────────────────────
  let livePos = $state(player?.media.position ?? 0);
  let dragPos = $state<number | null>(null);   // non-null while dragging
  let ticker: ReturnType<typeof setInterval>;
  let dragging = $state(false);

  $effect(() => {
    clearInterval(ticker);
    const pos = player?.media.position ?? null;
    const ref = player?.media.positionUpdatedAt ?? null;
    const dur = player?.media.duration ?? Infinity;
    if (isPlaying && pos != null && ref != null) {
      const tick = () => { livePos = Math.min(pos + (Date.now() - ref) / 1000, dur); };
      tick();
      ticker = setInterval(tick, 1_000);
    } else {
      livePos = pos ?? 0;
    }
    return () => clearInterval(ticker);
  });

  let displayPos = $derived(dragPos ?? livePos);
  let dur = $derived(player?.media.duration ?? null);
  let pct = $derived(dur && dur > 0 ? Math.min(displayPos / dur, 1) * 100 : 0);

  function fmtElapsed(s: number): string {
    if (!isFinite(s) || s < 0) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }
  function fmtRemaining(pos: number, total: number): string {
    const rem = Math.max(0, total - pos);
    return `-${Math.floor(rem / 60)}:${Math.floor(rem % 60).toString().padStart(2, '0')}`;
  }

  // ── Seek (drag on progress bar) ────────────────────────────────────────────
  let barEl: HTMLElement | null = $state(null);
  const canSeek = $derived(player?.caps.canSeek ?? false);

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
    if (dragPos != null && dur) {
      mp('media_seek', { seek_position: dragPos });
    }
    dragPos = null;
  }

  function stopProp(e: MouseEvent) { e.stopPropagation(); }
</script>

<svelte:window
  onmousemove={onWindowMove} onmouseup={onWindowUp}
  ontouchmove={onWindowMove} ontouchend={onWindowUp}
/>

<!-- Tapping tile body → /music. Controls stop propagation. -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="now-playing">
  <!-- Section label -->
  <div class="section-label">
    <Music2 size={13} strokeWidth={2} />
    <span>Now Playing</span>
  </div>

  <!-- Card -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="card" onclick={() => goto('/music')}>

    <!-- LEFT: artwork -->
    <div
      class="artwork"
      class:paused={!isPlaying && hasMedia}
    >
      {#if player?.media.artwork}
        <img src={player.media.artwork} alt="Album art" class="art-img" />
      {:else}
        <div class="art-ph">
          <Music2 strokeWidth={1.1} />
        </div>
      {/if}
    </div>

    <!-- RIGHT: track info + progress + controls -->
    <div class="right">

      <!-- Title row + transport -->
      <div class="title-row" onclick={stopProp}>
        <div class="title-text">
          <p class="title" class:idle={!hasMedia}>
            {hasMedia ? (player!.media.title ?? '') : 'Nothing playing'}
          </p>
          <p class="sub">
            {#if hasMedia}
              {[player!.media.artist, player!.media.album].filter(Boolean).join(' · ')}
            {:else}
              {player?.name ? `Listening on ${player.name}` : 'Tap to open Music tab'}
            {/if}
          </p>
          {#if hasMedia && player?.name}
            <p class="listening-on">Listening on {player.name}</p>
          {/if}
        </div>

        <!-- Transport: ⏮ ⏸/▶ ⏭ ✈ -->
        <div class="controls" style:opacity={isActive ? '1' : '0.3'} style:pointer-events={isActive ? 'auto' : 'none'}>
          <button
            class="ctrl"
            aria-label="Previous"
            disabled={!(player?.caps.canPrevious)}
            onclick={(e) => { e.stopPropagation(); mp('media_previous_track'); }}
          >
            <SkipBack size={28} strokeWidth={1.5} />
          </button>

          <button
            class="ctrl play"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onclick={(e) => { e.stopPropagation(); mp(isPlaying ? 'media_pause' : 'media_play'); }}
          >
            {#if isPlaying}
              <Pause size={34} strokeWidth={1.8} />
            {:else}
              <Play  size={34} strokeWidth={1.8} />
            {/if}
          </button>

          <button
            class="ctrl"
            aria-label="Next"
            disabled={!(player?.caps.canNext)}
            onclick={(e) => { e.stopPropagation(); mp('media_next_track'); }}
          >
            <SkipForward size={28} strokeWidth={1.5} />
          </button>

          <button
            class="ctrl airplay"
            class:open={castOpen}
            aria-label="Choose speaker"
            onclick={(e) => { e.stopPropagation(); castOpen = true; }}
          >
            <Airplay size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <!-- Progress bar (inline CarPlay style) -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="prog-wrap"
        onclick={stopProp}
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
          {#if dur != null}
            <span class="num">{fmtRemaining(displayPos, dur)}</span>
          {:else}
            <span class="num">–:––</span>
          {/if}
        </div>
      </div>

    </div>
  </div>
</div>

<!-- Cast picker sheet — rendered outside card so it's not clipped -->
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

  /* ── Card ── */
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

  /* ── Artwork ── */
  .artwork {
    flex-shrink: 0;
    width:  clamp(72px, 9vw, 110px);
    height: clamp(72px, 9vw, 110px);
    border-radius: 12px; overflow: hidden;
    background: var(--color-surface-2);
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    transition: opacity 300ms ease, filter 300ms ease;
  }
  .artwork.paused { opacity: 0.5; filter: saturate(0.5); }

  .art-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .art-ph {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.28;
  }
  .art-ph :global(svg) { width: 40%; height: 40%; }

  /* ── Right column ── */
  .right {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
    gap: clamp(5px, 0.7vh, 9px);
    justify-content: center;
  }

  /* Title row */
  .title-row {
    display: flex; align-items: flex-start;
    gap: clamp(8px, 1vw, 14px);
    cursor: default;
  }

  .title-text { flex: 1; min-width: 0; }

  .title {
    font-size: clamp(20px, 2vw, 28px);
    font-weight: 700; letter-spacing: -0.015em; line-height: 1.2;
    color: var(--color-text-primary); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .title.idle { font-weight: 400; opacity: 0.5; }

  .sub {
    font-size: clamp(13px, 1.3vw, 18px);
    color: var(--color-text-secondary); margin: 0; opacity: 0.72;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.35;
  }

  .listening-on {
    font-size: clamp(11px, 1.04vw, 14px);
    color: var(--color-text-tertiary); margin: 0;
    opacity: 0.65; font-style: italic;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* Controls */
  .controls {
    display: flex; align-items: center;
    gap: clamp(2px, 0.4vw, 6px);
    flex-shrink: 0;
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

  .ctrl.play { color: var(--color-text-primary); padding: 3px; }

  .ctrl.airplay { color: var(--color-accent-music); opacity: 0.75; }
  .ctrl.airplay.open { opacity: 1; }
  .ctrl.airplay:active { opacity: 1; }

  /* ── Progress bar (CarPlay inline style) ── */
  .prog-wrap {
    display: flex; flex-direction: column; gap: 3px;
    cursor: default; user-select: none;
  }

  .prog-track {
    position: relative;
    height: 4px; width: 100%;
    border-radius: 999px; background: var(--color-surface-2);
  }
  .prog-track.seekable { cursor: pointer; }
  .prog-track.dragging { cursor: grabbing; }

  .prog-fill {
    position: absolute; left: 0; top: 0; height: 100%;
    background: var(--color-accent-music);
    border-radius: 999px;
    pointer-events: none;
    transition: width 1s linear;
  }
  .prog-track.dragging .prog-fill { transition: none; }

  /* Thumb — only during drag */
  .prog-thumb {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 12px; height: 12px;
    border-radius: 50%; background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    pointer-events: none; z-index: 1;
  }

  .prog-times {
    display: flex; justify-content: space-between;
    font-size: clamp(11px, 0.97vw, 14px);
    color: var(--color-text-tertiary); opacity: 0.6;
  }
</style>
