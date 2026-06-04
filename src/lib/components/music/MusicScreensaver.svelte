<script lang="ts">
  import { fade }         from 'svelte/transition';
  import { cubicOut }     from 'svelte/easing';
  import { X }            from 'lucide-svelte';
  import ProgressBar      from './ProgressBar.svelte';
  import MusicTransport   from './MusicTransport.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  interface Props {
    player:  ResolvedPlayer;
    onClose: () => void;
  }
  let { player, onClose }: Props = $props();

  // Show the close X clearly only when the user touches the screen
  let xVisible   = $state(false);
  let xTimer: ReturnType<typeof setTimeout>;

  function touchActivity() {
    xVisible = true;
    clearTimeout(xTimer);
    xTimer = setTimeout(() => { xVisible = false; }, 3_000);
  }

  function mp(service: string, extra: Record<string, unknown> = {}) {
    callHaService('media_player', service, { entity_id: player.controlId, ...extra });
  }

  function cycleRepeat(cur: 'off' | 'one' | 'all') {
    const next = cur === 'off' ? 'one' : cur === 'one' ? 'all' : 'off';
    mp('repeat_set', { repeat: next });
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
  <!-- Ambient blurred artwork background -->
  {#if player.media.artwork}
    <div
      class="ambient"
      style:background-image="url('{player.media.artwork}')"
    ></div>
  {/if}
  <div class="dark-overlay"></div>

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
    <div class="artwork" class:paused={player.state !== 'playing'}>
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
      {#if player.media.album}
        <p class="album">{player.media.album}</p>
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
        onSeek={(s) => mp('media_seek', { seek_position: s })}
      />
    </div>

    <!-- Transport — large -->
    <MusicTransport
      playbackState={player.state}
      caps={player.caps}
      shuffle={player.media.shuffleOn}
      repeat={player.media.repeat}
      large
      onPlay={() => mp('media_play')}
      onPause={() => mp('media_pause')}
      onPrevious={() => mp('media_previous_track')}
      onNext={() => mp('media_next_track')}
      onShuffleToggle={() => mp('shuffle_set', { shuffle: !player.media.shuffleOn })}
      onRepeatCycle={() => cycleRepeat(player.media.repeat)}
    />

    <!-- Speaker name -->
    <p class="speaker-label">Playing on {player.name}</p>
  </div>
</div>

<style>
  .screensaver {
    position: fixed; inset: 0; z-index: 200;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }

  /* Ambient artwork fill — scaled + blurred */
  .ambient {
    position: absolute; inset: -60px;
    background-size: cover; background-position: center;
    filter: blur(70px);
    opacity: 0.38;
    transform: scale(1.15);
    pointer-events: none;
  }

  /* Dark base coat beneath the blur */
  .dark-overlay {
    position: absolute; inset: 0;
    background: rgba(10, 10, 12, 0.72);
    pointer-events: none;
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
    opacity: 0.6;
    backdrop-filter: blur(4px);
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
    width: min(60vw, 55vh);
    height: min(60vw, 55vh);
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

  .album {
    font-size: clamp(15px, 1.67vw, 26px);
    font-weight: 400; color: rgba(255,255,255,0.48);
    margin: 0;
  }

  /* Progress bar — full width of content column */
  .progress-wrap { width: 100%; }

  /* Speaker label */
  .speaker-label {
    font-size: clamp(13px, 1.25vw, 20px);
    color: rgba(255,255,255,0.38);
    margin: 0; letter-spacing: 0.02em;
  }
</style>
