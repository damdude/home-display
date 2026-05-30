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

  <!-- Card: horizontal split — artwork left, controls right -->
  <div class="card">
    <!-- Left: artwork square, viewport-responsive -->
    <div class="artwork">
      {#if player.attributes.entity_picture}
        <img src={player.attributes.entity_picture} alt="Album art" class="art-img" />
      {:else}
        <div class="art-placeholder">
          <Music2 size={44} strokeWidth={1.2} />
        </div>
      {/if}
    </div>

    <!-- Right: track info + transport -->
    <div class="info">
      <div class="track">
        <p class="title" class:idle={!hasMedia}>
          {hasMedia ? player.attributes.media_title : 'Nothing playing'}
        </p>
        {#if hasMedia && player.attributes.media_artist}
          <p class="artist">{player.attributes.media_artist}</p>
        {:else}
          <p class="artist idle-spacer" aria-hidden="true">&nbsp;</p>
        {/if}
      </div>

      <!-- Progress bar -->
      <div class="progress-track" style:opacity={hasMedia ? '1' : '0.3'}>
        {#if hasMedia}
          <div class="progress-fill" style:width="38%"></div>
        {/if}
      </div>

      <!-- Transport: prev · play/pause · next -->
      <div class="controls">
        <button
          class="ctrl"
          aria-label="Previous"
          style:opacity={hasMedia ? '1' : '0.4'}
          disabled={!hasMedia}
        >
          <SkipBack size={28} strokeWidth={1.6} />
        </button>

        <button
          class="ctrl play-btn"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style:opacity={hasMedia ? '1' : '0.4'}
        >
          {#if isPlaying}
            <Pause size={32} strokeWidth={1.4} />
          {:else}
            <Play size={32} strokeWidth={1.4} />
          {/if}
        </button>

        <button
          class="ctrl"
          aria-label="Next"
          style:opacity={hasMedia ? '1' : '0.4'}
          disabled={!hasMedia}
        >
          <SkipForward size={28} strokeWidth={1.6} />
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

  /* ── Card ── */
  .card {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 0.9rem 1.6rem;
    display: flex;
    align-items: center;
    gap: 1.6rem;
  }

  /* ── Artwork: scales with viewport width ── */
  .artwork {
    flex-shrink: 0;
    /* vw-based so it adapts at 1280 and 1440; square always */
    width: clamp(100px, 15.28vw, 220px);
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

  /* ── Right column ── */
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.6rem;
  }

  .track {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  /* Track title: 36-40px */
  .title {
    font-size: clamp(26px, 2.78vw, 40px);
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

  /* Artist: 24-26px */
  .artist {
    font-size: clamp(18px, 2.08vw, 30px);
    font-weight: 400;
    color: var(--color-text-secondary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.75;
  }

  .artist.idle-spacer { opacity: 0; }

  /* Progress bar: 6-8px height */
  .progress-track {
    width: 100%;
    height: 7px;
    background: var(--color-surface-2);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent-music);
    border-radius: 999px;
    opacity: 0.85;
  }

  /* Transport */
  .controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  /* Prev/Next: 52-56px */
  .ctrl {
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(44px, 3.89vw, 56px);
    height: clamp(44px, 3.89vw, 56px);
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

  /* Play/Pause: 84-96px */
  .ctrl.play-btn {
    width: clamp(72px, 6.67vw, 96px);
    height: clamp(72px, 6.67vw, 96px);
    background: color-mix(in srgb, var(--color-accent-music) 16%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-accent-music) 28%, transparent);
    color: var(--color-accent-music);
  }

  .ctrl.play-btn:active {
    background: color-mix(in srgb, var(--color-accent-music) 24%, var(--color-surface-2));
    transform: scale(0.93);
  }
</style>
