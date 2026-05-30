<script lang="ts">
  import { Music2, Play, Pause, SkipBack, SkipForward } from 'lucide-svelte';
  import type { MediaPlayerState } from '$lib/data/placeholder.js';

  let { player }: { player: MediaPlayerState } = $props();

  let isPlaying = $derived(player.state === 'playing');
  let hasMedia  = $derived(!!player.attributes.media_title);
</script>

<div class="now-playing">
  <!-- Section label -->
  <div class="section-label">
    <Music2 size={13} strokeWidth={2} />
    <span>Now Playing</span>
  </div>

  <!-- Card: horizontal split -->
  <div class="card">
    <!-- Left: artwork square -->
    <div class="artwork">
      {#if player.attributes.entity_picture}
        <img src={player.attributes.entity_picture} alt="Album art" class="art-img" />
      {:else}
        <div class="art-placeholder">
          <Music2 size={36} strokeWidth={1.2} />
        </div>
      {/if}
    </div>

    <!-- Right: track info + controls -->
    <div class="info">
      <div class="track">
        <p class="title" class:idle={!hasMedia}>
          {hasMedia ? player.attributes.media_title : 'Nothing playing'}
        </p>
        {#if hasMedia && player.attributes.media_artist}
          <p class="artist">{player.attributes.media_artist}</p>
        {:else}
          <!-- Empty spacer preserves layout height -->
          <p class="artist idle-spacer" aria-hidden="true">&nbsp;</p>
        {/if}
      </div>

      <!-- Progress bar -->
      <div class="progress-track">
        {#if hasMedia}
          <div class="progress-fill" style:width="38%"></div>
        {/if}
      </div>

      <!-- Transport controls -->
      <div class="controls">
        <button
          class="ctrl"
          aria-label="Previous"
          style:opacity={hasMedia ? '1' : '0.4'}
          disabled={!hasMedia}
        >
          <SkipBack size={24} strokeWidth={1.6} />
        </button>

        <button
          class="ctrl play-btn"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style:opacity={hasMedia ? '1' : '0.4'}
        >
          {#if isPlaying}
            <Pause size={26} strokeWidth={1.5} />
          {:else}
            <Play size={26} strokeWidth={1.5} />
          {/if}
        </button>

        <button
          class="ctrl"
          aria-label="Next"
          style:opacity={hasMedia ? '1' : '0.4'}
          disabled={!hasMedia}
        >
          <SkipForward size={24} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .now-playing {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  /* ── Section label ── */
  .section-label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--color-text-tertiary);
    font-size: var(--type-label);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 0.2rem;
  }

  /* ── Card: horizontal layout ── */
  .card {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 0.85rem 1.4rem;
    display: flex;
    align-items: center;
    gap: 1.4rem;
  }

  /* ── Left: artwork ── */
  .artwork {
    flex-shrink: 0;
    /* Size relative to zone height; portrait display, zone is ~14% of 2560px ≈ 358px → ~180px art */
    width: clamp(80px, 12.5vw, 180px);
    aspect-ratio: 1;
    border-radius: 16px;
    overflow: hidden;
    background: var(--color-surface-2);
  }

  .art-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-music);
    opacity: 0.35;
  }

  /* ── Right: info column ── */
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.55rem;
  }

  .track {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .title {
    font-size: clamp(18px, 1.94vw, 28px);
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title.idle {
    font-weight: 400;
    opacity: 0.6;
  }

  .artist {
    font-size: clamp(14px, 1.39vw, 20px);
    font-weight: 400;
    color: var(--color-text-secondary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.75;
  }

  .artist.idle-spacer {
    opacity: 0;
  }

  /* Progress bar */
  .progress-track {
    width: 100%;
    height: 4px;
    background: var(--color-surface-2);
    border-radius: 999px;
    overflow: hidden;
    opacity: 0.5;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent-music);
    border-radius: 999px;
    opacity: 0.9;
  }

  /* Transport controls */
  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ctrl {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 200ms cubic-bezier(0.32, 0.72, 0, 1),
                transform  150ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .ctrl:active {
    background: var(--color-surface-2);
    transform: scale(0.9);
  }

  .ctrl:disabled {
    cursor: default;
    pointer-events: none;
  }

  .ctrl.play-btn {
    width: 56px;
    height: 56px;
    background: color-mix(in srgb, var(--color-accent-music) 16%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-accent-music) 28%, transparent);
    color: var(--color-accent-music);
  }

  .ctrl.play-btn:active {
    background: color-mix(in srgb, var(--color-accent-music) 24%, var(--color-surface-2));
    transform: scale(0.93);
  }
</style>
