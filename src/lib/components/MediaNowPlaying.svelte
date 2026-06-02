<script lang="ts">
  /**
   * Home-tab compact Now Playing tile.
   *
   * Shows the active media_player's artwork, title, artist, and a
   * minimal play/pause control. Tapping anywhere navigates to /music
   * for the full Music tab.
   *
   * Accepts a ResolvedPlayer (from musicState) or null.
   */
  import { goto }   from '$app/navigation';
  import { Music2, Play, Pause } from 'lucide-svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  interface Props {
    player: ResolvedPlayer | null;
  }
  let { player }: Props = $props();

  let isPlaying = $derived(player?.state === 'playing');
  let hasMedia  = $derived(!!(player?.media.title));

  function mp(service: string) {
    if (!player) return;
    callHaService('media_player', service, { entity_id: player.controlId });
  }

  function handlePlayPause(e: MouseEvent) {
    e.stopPropagation(); // don't navigate when tapping play/pause
    mp(isPlaying ? 'media_pause' : 'media_play');
  }
</script>

<!-- Tapping the tile navigates to Music tab -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="now-playing" onclick={() => goto('/music')}>
  <!-- Section label -->
  <div class="section-label">
    <Music2 size={13} strokeWidth={2} />
    <span>Now Playing</span>
  </div>

  <!-- Card -->
  <div class="card">
    <!-- Artwork -->
    <div class="artwork" class:paused={!isPlaying && hasMedia}>
      {#if player?.media.artwork}
        <img src={player.media.artwork} alt="Album art" class="art-img" />
      {:else}
        <div class="art-placeholder">
          <Music2 strokeWidth={1.1} />
        </div>
      {/if}
    </div>

    <!-- Track info -->
    <div class="info">
      <div class="track">
        <p class="title" class:idle={!hasMedia}>
          {hasMedia ? (player!.media.title ?? '') : 'Nothing playing'}
        </p>
        {#if hasMedia && player?.media.artist}
          <p class="artist">{player.media.artist}</p>
        {:else}
          <p class="artist idle-hint">
            {hasMedia ? '' : 'Tap to open Music tab'}
          </p>
        {/if}
      </div>

      <!-- Thin progress bar -->
      <div class="progress-track" style:opacity={hasMedia ? '1' : '0.22'}>
        {#if hasMedia && player?.media.duration && player.media.position != null}
          {@const pct = Math.min(player.media.position / player.media.duration, 1) * 100}
          <div class="progress-fill" style:width="{pct}%"></div>
        {:else if hasMedia}
          <div class="progress-fill" style:width="0%"></div>
        {/if}
      </div>

      <!-- Play/Pause -->
      <div class="controls">
        <button
          class="play-btn"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style:opacity={hasMedia ? '1' : '0.35'}
          onclick={handlePlayPause}
        >
          {#if isPlaying}
            <Pause size={28} strokeWidth={1.5} />
          {:else}
            <Play size={28} strokeWidth={1.5} />
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .now-playing {
    height: 100%; display: flex; flex-direction: column; gap: 0.35rem;
    cursor: pointer;
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
    padding: 0.9rem 1.6rem;
    display: flex; align-items: center; gap: 1.4rem;
    transition: background 200ms;
  }
  .card:active { background: var(--color-surface-2); }

  /* Artwork */
  .artwork {
    flex-shrink: 0;
    width: clamp(80px, 10.4vw, 150px);
    height: clamp(80px, 10.4vw, 150px);
    border-radius: 14px; overflow: hidden;
    background: var(--color-surface-2);
    transition: opacity 250ms ease, filter 250ms ease;
  }
  .artwork.paused { opacity: 0.8; filter: saturate(0.6); }

  .art-img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .art-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.3;
  }
  .art-placeholder :global(svg) { width: 40%; height: 40%; }

  /* Info column */
  .info {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; justify-content: center; gap: 0.5rem;
  }

  .track { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }

  .title {
    font-size: clamp(22px, 2.31vw, 34px);
    font-weight: 600; color: var(--color-text-primary); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .title.idle { font-weight: 400; opacity: 0.55; }

  .artist {
    font-size: clamp(15px, 1.67vw, 24px);
    font-weight: 400; color: var(--color-text-secondary);
    margin: 0; opacity: 0.72;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .artist.idle-hint { font-style: italic; opacity: 0.38; }

  /* Progress bar */
  .progress-track {
    width: 100%; height: 5px;
    background: var(--color-surface-2); border-radius: 999px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: var(--color-accent-music); border-radius: 999px;
    opacity: 0.8;
  }

  /* Controls */
  .controls { display: flex; align-items: center; }

  .play-btn {
    display: flex; align-items: center; justify-content: center;
    width: clamp(56px, 5.56vw, 80px); height: clamp(56px, 5.56vw, 80px);
    border-radius: 50%; border: none;
    background: color-mix(in srgb, var(--color-accent-music) 15%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-accent-music) 28%, transparent);
    color: var(--color-accent-music); cursor: pointer;
    transition: transform 150ms cubic-bezier(0.32,0.72,0,1), background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .play-btn:active { transform: scale(0.91); }
</style>
