<script lang="ts">
  import { fade }         from 'svelte/transition';
  import { cubicOut }     from 'svelte/easing';
  import { X, Play, Pause, SkipBack, SkipForward } from 'lucide-svelte';
  import ProgressBar      from './ProgressBar.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  interface Props {
    player:  ResolvedPlayer;
    onClose: () => void;
  }
  let { player, onClose }: Props = $props();

  let isPlaying = $derived(player.state === 'playing');

  // Show the close X clearly only when the user touches the screen
  let xVisible   = $state(false);
  let xTimer: ReturnType<typeof setTimeout>;

  function touchActivity() {
    xVisible = true;
    clearTimeout(xTimer);
    xTimer = setTimeout(() => { xVisible = false; }, 3_000);
  }

  function mp(service: string) {
    callHaService('media_player', service, { entity_id: player.controlId });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="screensaver"
  transition:fade={{ duration: 600, easing: cubicOut }}
  onmousemove={touchActivity}
  ontouchstart={touchActivity}
  onclick={touchActivity}
>
  <!-- Close button — top-right, fades in on interaction -->
  <button
    class="close-btn"
    class:visible={xVisible}
    onclick={onClose}
    aria-label="Exit screensaver"
  >
    <X size={22} strokeWidth={2} />
  </button>

  <!-- Main content — centered -->
  <div class="main">
    <!-- Artwork -->
    <div class="artwork" class:paused={!isPlaying}>
      {#if player.media.artwork}
        <img src={player.media.artwork} alt="Album art" class="art-img" />
      {:else}
        <div class="art-placeholder"></div>
      {/if}
    </div>

    <!-- Track info -->
    <div class="track-info">
      <h1 class="title">{player.media.title ?? 'Nothing playing'}</h1>
      {#if player.media.artist}
        <p class="artist">{player.media.artist}</p>
      {/if}
    </div>

    <!-- Progress -->
    <div class="progress-wrap">
      <ProgressBar
        position={player.media.position}
        duration={player.media.duration}
        positionUpdatedAt={player.media.positionUpdatedAt}
        playbackState={player.state}
        canSeek={player.caps.canSeek}
        large
        onSeek={(s) => callHaService('media_player', 'media_seek', { entity_id: player.controlId, seek_position: s })}
      />
    </div>

    <!-- Minimal transport: SkipBack · Play/Pause · SkipForward -->
    <div class="transport">
      <button class="ctrl" onclick={() => mp('media_previous_track')} disabled={!player.caps.canPrevious} aria-label="Previous">
        <SkipBack size={44} strokeWidth={1.5} />
      </button>
      <button class="ctrl play-btn" onclick={() => mp(isPlaying ? 'media_pause' : 'media_play')} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {#if isPlaying}
          <Pause size={56} strokeWidth={1.8} />
        {:else}
          <Play  size={56} strokeWidth={1.8} />
        {/if}
      </button>
      <button class="ctrl" onclick={() => mp('media_next_track')} disabled={!player.caps.canNext} aria-label="Next">
        <SkipForward size={44} strokeWidth={1.5} />
      </button>
    </div>
  </div>
</div>

<style>
  .screensaver {
    position: fixed; inset: 0; z-index: 200;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    background: #000000;
  }

  /* Close button */
  .close-btn {
    position: absolute; top: clamp(16px, 2vh, 28px); right: clamp(16px, 2vw, 28px);
    z-index: 1;
    width: 44px; height: 44px; border-radius: 12px;
    border: none;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity 300ms ease, background 200ms;
    -webkit-tap-highlight-color: transparent;
  }
  .close-btn.visible { opacity: 1; }
  .close-btn:active   { background: rgba(255,255,255,0.18); }

  /* Main content column */
  .main {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    align-items: center; gap: clamp(16px, 2vh, 28px);
    width: min(60vw, 80vh);
    padding: 0 5vw;
  }

  /* Artwork */
  .artwork {
    width: min(55vw, 50vh);
    height: min(55vw, 50vh);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 16px 60px rgba(0,0,0,0.65);
    flex-shrink: 0;
    transition: opacity 300ms ease, filter 300ms ease;
  }
  .artwork.paused { opacity: 0.8; filter: saturate(0.55); }

  .art-img        { width: 100%; height: 100%; object-fit: cover; display: block; }
  .art-placeholder { width: 100%; height: 100%; background: var(--color-surface-2); }

  /* Track info */
  .track-info {
    text-align: center; width: 100%;
    display: flex; flex-direction: column; gap: 0.2rem;
  }

  .title {
    font-size: clamp(36px, 4.5vw, 72px);
    font-weight: 700; letter-spacing: -0.025em;
    color: rgba(255,255,255,0.95);
    margin: 0; line-height: 1.1;
    overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }

  .artist {
    font-size: clamp(20px, 2.4vw, 40px);
    font-weight: 400; color: rgba(255,255,255,0.72);
    margin: 0;
  }

  /* Progress bar — full width of content column */
  .progress-wrap { width: 100%; }

  /* Transport */
  .transport {
    display: flex; align-items: center; justify-content: center;
    gap: clamp(24px, 4vw, 56px);
  }

  .ctrl {
    border: none; background: none; cursor: pointer;
    color: rgba(255,255,255,0.88);
    display: flex; align-items: center; justify-content: center;
    padding: 4px; border-radius: 50%;
    transition: transform 130ms cubic-bezier(0.32,0.72,0,1), opacity 130ms;
    -webkit-tap-highlight-color: transparent;
  }
  .ctrl:disabled { opacity: 0.28; cursor: default; pointer-events: none; }
  .ctrl:not(:disabled):active { transform: scale(0.88); }
  .play-btn { padding: 6px; }
</style>
