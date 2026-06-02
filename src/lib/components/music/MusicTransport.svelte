<script lang="ts">
  import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from 'lucide-svelte';
  import type { PlayerCaps } from '$lib/music/playerResolution.js';

  interface Props {
    state:   string;
    caps:    PlayerCaps;
    shuffle: boolean;
    repeat:  'off' | 'one' | 'all';
    large?:  boolean;  // screensaver uses bigger buttons
    onPlay?:          () => void;
    onPause?:         () => void;
    onPrevious?:      () => void;
    onNext?:          () => void;
    onShuffleToggle?: () => void;
    onRepeatCycle?:   () => void;
  }
  let {
    state, caps, shuffle, repeat, large = false,
    onPlay, onPause, onPrevious, onNext, onShuffleToggle, onRepeatCycle,
  }: Props = $props();

  let isPlaying = $derived(state === 'playing');

  // Gap between controls scales with large flag
  let gap = $derived(large ? 'clamp(24px, 3vw, 48px)' : 'clamp(14px, 1.8vw, 28px)');
</script>

<div class="transport" style:gap>
  <!-- Shuffle — shown only if supported -->
  {#if caps.canShuffle}
    <button
      class="side-btn"
      class:active={shuffle}
      onclick={onShuffleToggle}
      aria-label="Toggle shuffle"
    >
      <Shuffle />
    </button>
  {:else}
    <span class="side-spacer" aria-hidden="true"></span>
  {/if}

  <!-- Previous -->
  {#if caps.canPrevious}
    <button class="skip-btn" onclick={onPrevious} aria-label="Previous track">
      <SkipBack />
    </button>
  {/if}

  <!-- Play / Pause — always shown, greyed when off -->
  <button
    class="play-btn"
    class:large
    onclick={isPlaying ? onPause : onPlay}
    aria-label={isPlaying ? 'Pause' : 'Play'}
  >
    {#if isPlaying}
      <Pause />
    {:else}
      <Play />
    {/if}
  </button>

  <!-- Next -->
  {#if caps.canNext}
    <button class="skip-btn" onclick={onNext} aria-label="Next track">
      <SkipForward />
    </button>
  {/if}

  <!-- Repeat -->
  {#if caps.canRepeat}
    <button
      class="side-btn"
      class:active={repeat !== 'off'}
      onclick={onRepeatCycle}
      aria-label="Cycle repeat"
    >
      {#if repeat === 'one'}
        <Repeat1 />
      {:else}
        <Repeat />
      {/if}
    </button>
  {:else}
    <span class="side-spacer" aria-hidden="true"></span>
  {/if}
</div>

<style>
  .transport {
    display: flex; align-items: center; justify-content: center; width: 100%;
  }

  /* Shuffle / Repeat */
  .side-btn, .side-spacer {
    width: clamp(28px, 2.4vw, 38px);
    height: clamp(28px, 2.4vw, 38px);
  }
  .side-btn {
    border: none; background: none; cursor: pointer; border-radius: 50%;
    color: var(--color-text-tertiary); opacity: 0.5;
    padding: 0; display: flex; align-items: center; justify-content: center;
    transition: opacity 150ms, color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .side-btn.active { color: var(--color-accent-music); opacity: 1; }
  .side-btn :global(svg) { width: 100%; height: 100%; }

  /* Previous / Next */
  .skip-btn {
    width: clamp(44px, 3.6vw, 60px);
    height: clamp(44px, 3.6vw, 60px);
    border: none; background: none; cursor: pointer; border-radius: 50%;
    color: var(--color-text-secondary); padding: 0;
    display: flex; align-items: center; justify-content: center;
    transition: transform 150ms cubic-bezier(0.32,0.72,0,1), background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .skip-btn :global(svg) { width: 55%; height: 55%; }
  .skip-btn:active { transform: scale(0.88); background: var(--color-surface-2); }

  /* Play / Pause circle */
  .play-btn {
    width: clamp(76px, 6.4vw, 96px);
    height: clamp(76px, 6.4vw, 96px);
    border: none; border-radius: 50%;
    background: var(--color-accent-music);
    color: #fff; cursor: pointer; padding: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 24px rgba(155,123,181,0.38);
    transition: transform 150ms cubic-bezier(0.32,0.72,0,1), box-shadow 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .play-btn :global(svg) { width: 38%; height: 38%; }
  .play-btn:active { transform: scale(0.93); box-shadow: 0 2px 12px rgba(155,123,181,0.28); }

  /* Large variant — screensaver */
  .play-btn.large {
    width: clamp(110px, 9.5vw, 140px);
    height: clamp(110px, 9.5vw, 140px);
  }
</style>
