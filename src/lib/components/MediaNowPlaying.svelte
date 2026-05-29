<script lang="ts">
  import { Play, Pause, SkipBack, SkipForward, Music2 } from 'lucide-svelte';
  import type { MediaPlayerState } from '$lib/data/placeholder.js';

  let { player }: { player: MediaPlayerState } = $props();

  let isPlaying = $derived(player.state === 'playing');
  let hasMedia  = $derived(!!player.attributes.media_title);
</script>

<div class="card">
  <!-- Artwork -->
  <div class="artwork">
    {#if player.attributes.entity_picture}
      <img src={player.attributes.entity_picture} alt="Album art" class="art-img" />
    {:else}
      <div class="art-placeholder">
        <Music2 size={32} strokeWidth={1.3} />
      </div>
    {/if}
  </div>

  <!-- Info + controls -->
  <div class="info">
    <div class="track">
      <p class="title">
        {hasMedia ? player.attributes.media_title : 'Nothing Playing'}
      </p>
      {#if player.attributes.media_artist}
        <p class="artist">{player.attributes.media_artist}</p>
      {/if}
    </div>

    <div class="controls">
      <button class="ctrl" aria-label="Previous" disabled={!hasMedia}>
        <SkipBack size={22} strokeWidth={1.6} />
      </button>
      <button class="ctrl play" aria-label={isPlaying ? 'Pause' : 'Play'} disabled={!hasMedia}>
        {#if isPlaying}
          <Pause size={26} strokeWidth={1.6} />
        {:else}
          <Play size={26} strokeWidth={1.6} />
        {/if}
      </button>
      <button class="ctrl" aria-label="Next" disabled={!hasMedia}>
        <SkipForward size={22} strokeWidth={1.6} />
      </button>
    </div>
  </div>
</div>

<style>
  .card {
    height: 100%;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 0.8rem 1.4rem;
  }

  /* Artwork */
  .artwork {
    flex-shrink: 0;
    width: clamp(52px, 7vh, 80px);
    aspect-ratio: 1;
    border-radius: 12px;
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
    color: var(--color-text-tertiary);
  }

  /* Info */
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .track {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .title {
    font-size: var(--type-body);
    font-weight: 500;
    color: var(--color-text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artist {
    font-size: var(--type-caption);
    color: var(--color-text-secondary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Controls */
  .controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .ctrl {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 200ms cubic-bezier(0.32, 0.72, 0, 1),
                color     200ms cubic-bezier(0.32, 0.72, 0, 1),
                opacity   200ms;
    -webkit-tap-highlight-color: transparent;
  }

  .ctrl:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .ctrl:not(:disabled):active {
    background: var(--color-surface-2);
    transform: scale(0.93);
  }

  .ctrl.play {
    width: 48px;
    height: 48px;
    background: var(--color-surface-2);
    color: var(--color-text-primary);
  }

  .ctrl.play:not(:disabled):hover {
    background: var(--color-border);
  }
</style>
