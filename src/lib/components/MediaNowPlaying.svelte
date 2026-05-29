<script lang="ts">
  import {
    Music2, Play, Pause, SkipBack, SkipForward,
    Shuffle, Repeat,
  } from 'lucide-svelte';
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

  <div class="card">
    {#if hasMedia}
      <!-- ── State B: something is playing ── -->
      <div class="state-b">
        <!-- Artwork -->
        <div class="artwork">
          {#if player.attributes.entity_picture}
            <img src={player.attributes.entity_picture} alt="Album art" class="art-img" />
          {:else}
            <div class="art-placeholder">
              <Music2 size={40} strokeWidth={1.2} />
            </div>
          {/if}
        </div>

        <!-- Track info -->
        <div class="track">
          <p class="title">{player.attributes.media_title}</p>
          {#if player.attributes.media_artist}
            <p class="artist">{player.attributes.media_artist}</p>
          {/if}
        </div>

        <!-- Progress bar (static placeholder) -->
        <div class="progress-track">
          <div class="progress-fill" style:width="38%"></div>
        </div>

        <!-- Transport controls -->
        <div class="controls">
          <button class="ctrl small" aria-label="Shuffle">
            <Shuffle size={18} strokeWidth={1.6} />
          </button>
          <button class="ctrl" aria-label="Previous">
            <SkipBack size={22} strokeWidth={1.6} />
          </button>
          <button class="ctrl play-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {#if isPlaying}
              <Pause size={28} strokeWidth={1.5} />
            {:else}
              <Play size={28} strokeWidth={1.5} />
            {/if}
          </button>
          <button class="ctrl" aria-label="Next">
            <SkipForward size={22} strokeWidth={1.6} />
          </button>
          <button class="ctrl small" aria-label="Repeat">
            <Repeat size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    {:else}
      <!-- ── State A: nothing playing ── -->
      <a href="/music" class="state-a" aria-label="Go to music">
        <div class="play-circle">
          <Play size={32} strokeWidth={1.4} />
        </div>
        <span class="idle-label">Tap to play</span>
      </a>
    {/if}
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

  /* ── Card ── */
  .card {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── State A: idle ── */
  .state-a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  .play-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-accent-music) 14%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-accent-music) 28%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-music);
    transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1),
                background 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .state-a:active .play-circle {
    transform: scale(0.93);
    background: color-mix(in srgb, var(--color-accent-music) 22%, var(--color-surface-2));
  }

  .idle-label {
    font-size: var(--type-caption);
    font-weight: 500;
    color: var(--color-text-tertiary);
    letter-spacing: 0.02em;
  }

  /* ── State B: now playing ── */
  .state-b {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.8rem 1.6rem;
  }

  .artwork {
    width: clamp(64px, 9vw, 96px);
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    background: var(--color-surface-2);
    flex-shrink: 0;
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
    opacity: 0.5;
  }

  .track {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    min-width: 0;
    width: 100%;
  }

  .title {
    font-size: var(--type-body);
    font-weight: 500;
    color: var(--color-text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    width: 100%;
  }

  .artist {
    font-size: var(--type-caption);
    color: var(--color-text-secondary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    width: 100%;
  }

  /* Progress */
  .progress-track {
    width: 100%;
    height: 3px;
    background: var(--color-surface-3);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent-music);
    border-radius: 999px;
    opacity: 0.8;
  }

  /* Controls */
  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    width: 100%;
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
                transform  200ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .ctrl.small {
    width: 36px;
    height: 36px;
    opacity: 0.6;
  }

  .ctrl:active {
    transform: scale(0.9);
    background: var(--color-surface-2);
  }

  .ctrl.play-btn {
    width: 72px;
    height: 72px;
    background: color-mix(in srgb, var(--color-accent-music) 16%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-accent-music) 28%, transparent);
    color: var(--color-accent-music);
  }

  .ctrl.play-btn:active {
    background: color-mix(in srgb, var(--color-accent-music) 24%, var(--color-surface-2));
    transform: scale(0.93);
  }
</style>
