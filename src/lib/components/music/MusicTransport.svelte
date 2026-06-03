<script lang="ts">
  import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from 'lucide-svelte';
  import type { PlayerCaps } from '$lib/music/playerResolution.js';

  interface Props {
    state:   string;
    caps:    PlayerCaps;
    shuffle: boolean;
    repeat:  'off' | 'one' | 'all';
    large?:  boolean;
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
</script>

<div class="transport" class:large>

  <!-- Shuffle -->
  {#if caps.canShuffle}
    <button
      class="side-btn"
      class:active={shuffle}
      onclick={onShuffleToggle}
      aria-label="Toggle shuffle"
    >
      <Shuffle size={large ? 28 : 22} strokeWidth={1.5} />
    </button>
  {:else}
    <span class="side-spacer"></span>
  {/if}

  <!-- Previous -->
  {#if caps.canPrevious}
    <button class="skip-btn" onclick={onPrevious} aria-label="Previous track">
      <SkipBack size={large ? 42 : 32} strokeWidth={1.5} />
    </button>
  {:else}
    <!-- Show greyed skip even when not supported — Apple always shows all 5 -->
    <button class="skip-btn" disabled aria-label="Previous track">
      <SkipBack size={large ? 42 : 32} strokeWidth={1.5} />
    </button>
  {/if}

  <!-- Play / Pause -->
  <button
    class="play-btn"
    onclick={isPlaying ? onPause : onPlay}
    aria-label={isPlaying ? 'Pause' : 'Play'}
  >
    {#if isPlaying}
      <Pause size={large ? 44 : 52} strokeWidth={1.8} />
    {:else}
      <Play  size={large ? 44 : 52} strokeWidth={1.8} />
    {/if}
  </button>

  <!-- Next -->
  {#if caps.canNext}
    <button class="skip-btn" onclick={onNext} aria-label="Next track">
      <SkipForward size={large ? 42 : 32} strokeWidth={1.5} />
    </button>
  {:else}
    <button class="skip-btn" disabled aria-label="Next track">
      <SkipForward size={large ? 42 : 32} strokeWidth={1.5} />
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
        <Repeat1 size={large ? 28 : 22} strokeWidth={1.5} />
      {:else}
        <Repeat  size={large ? 28 : 22} strokeWidth={1.5} />
      {/if}
    </button>
  {:else}
    <span class="side-spacer"></span>
  {/if}

</div>

<style>
  .transport {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(20px, 4vw, 52px);
    width: 100%;
  }
  .large { gap: clamp(28px, 4.5vw, 56px); }

  /* Shuffle / Repeat */
  .side-btn {
    border: none; background: none; cursor: pointer; border-radius: 50%;
    color: var(--color-text-tertiary); opacity: 0.45;
    padding: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: opacity 180ms, color 180ms;
    -webkit-tap-highlight-color: transparent;
  }
  .side-btn.active { color: var(--color-accent-music); opacity: 1; }
  .side-btn:active { opacity: 0.7; }

  .side-spacer { width: 34px; height: 34px; }

  /* Skip buttons */
  .skip-btn {
    border: none; background: none; cursor: pointer; border-radius: 50%;
    color: var(--color-text-primary); padding: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 150ms cubic-bezier(0.32,0.72,0,1), opacity 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .skip-btn:disabled { opacity: 0.28; cursor: default; pointer-events: none; }
  .skip-btn:not(:disabled):active { transform: scale(0.86); }

  /* Play / Pause — no circle, just the icon, slightly bigger */
  .play-btn {
    border: none; background: none; cursor: pointer; border-radius: 50%;
    color: var(--color-text-primary); padding: 4px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 150ms cubic-bezier(0.32,0.72,0,1), opacity 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .play-btn:active { transform: scale(0.91); }
</style>
