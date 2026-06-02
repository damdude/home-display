<script lang="ts">
  import { Volume2, VolumeX, Volume1 } from 'lucide-svelte';

  interface Props {
    volume:  number | null;
    muted:   boolean;
    canSet:  boolean;
    canMute: boolean;
    canStep: boolean;
    onSet?:  (v: number) => void;
    onMute?: () => void;
  }
  let { volume, muted, canSet, canMute, canStep, onSet, onMute }: Props = $props();

  // Mirror local volume for smooth slider feel; sync when HA updates
  let localVol = $state(volume ?? 0.5);
  $effect(() => { if (volume != null) localVol = volume; });

  function handleSlider(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    localVol = v;
    onSet?.(v);
  }

  let dispVol = $derived(muted ? 0 : localVol);
</script>

<div class="vol-row">
  <!-- Mute toggle -->
  <button
    class="mute-btn"
    class:muted
    onclick={onMute}
    disabled={!canMute}
    aria-label={muted ? 'Unmute' : 'Mute'}
  >
    {#if dispVol === 0}
      <VolumeX size={20} strokeWidth={1.6} />
    {:else if dispVol < 0.5}
      <Volume1 size={20} strokeWidth={1.6} />
    {:else}
      <Volume2 size={20} strokeWidth={1.6} />
    {/if}
  </button>

  {#if canSet}
    <input
      class="slider"
      type="range" min="0" max="1" step="0.02"
      value={dispVol}
      oninput={handleSlider}
      aria-label="Volume"
    />
  {:else if canStep}
    <button class="step" onclick={() => onSet?.(Math.max(0, localVol - 0.1))} aria-label="Volume down">−</button>
    <span class="pct num">{Math.round(localVol * 100)}%</span>
    <button class="step" onclick={() => onSet?.(Math.min(1, localVol + 0.1))} aria-label="Volume up">+</button>
  {:else}
    <!-- volume not controllable — show read-only bar -->
    <div class="readonly-bar">
      <div class="readonly-fill" style:width="{dispVol * 100}%"></div>
    </div>
  {/if}
</div>

<style>
  .vol-row {
    display: flex; align-items: center; gap: 0.55rem; width: 100%;
  }

  .mute-btn {
    border: none; background: none;
    color: var(--color-text-tertiary); cursor: pointer;
    padding: 0; flex-shrink: 0; opacity: 0.75;
    transition: opacity 150ms, color 150ms;
    display: flex; align-items: center;
  }
  .mute-btn:disabled { opacity: 0.3; cursor: default; }
  .mute-btn.muted    { color: var(--color-accent-triggered); opacity: 0.9; }
  .mute-btn:not(:disabled):active { opacity: 1; }

  .slider {
    flex: 1; height: 4px; cursor: pointer;
    accent-color: var(--color-accent-music);
    -webkit-appearance: none;
    appearance: none;
    background: var(--color-surface-2);
    border-radius: 999px;
    outline: none;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--color-accent-music);
    cursor: pointer;
    box-shadow: 0 0 0 2px rgba(155,123,181,0.25);
  }

  .step {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-primary);
    font-size: 18px; cursor: pointer; line-height: 1;
    display: flex; align-items: center; justify-content: center;
  }
  .pct {
    font-size: 13px; color: var(--color-text-secondary);
    min-width: 2.8em; text-align: center;
  }

  .readonly-bar {
    flex: 1; height: 4px;
    background: var(--color-surface-2);
    border-radius: 999px; overflow: hidden;
  }
  .readonly-fill {
    height: 100%;
    background: var(--color-accent-music);
    opacity: 0.5;
    border-radius: 999px;
  }
</style>
