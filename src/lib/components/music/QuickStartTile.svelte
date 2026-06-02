<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label:   string;
    color:   string;   // CSS color for icon + accent border
    onclick?: () => void;
    children: Snippet;
  }
  let { label, color, onclick, children }: Props = $props();

  // Brief attention pulse on tap
  let pulsing = $state(false);
  function tap() {
    pulsing = true;
    setTimeout(() => { pulsing = false; }, 600);
    onclick?.();
  }
</script>

<button
  class="tile"
  class:pulsing
  style:--tile-color={color}
  onclick={tap}
  aria-label={label}
>
  <span class="icon">
    {@render children()}
  </span>
  <span class="lbl">{label}</span>
</button>

<style>
  .tile {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.45rem;
    flex: 1; min-width: 0;
    aspect-ratio: 1 / 1;
    max-height: 100%;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    cursor: pointer; padding: 0.6rem 0.4rem;
    transition:
      background 200ms cubic-bezier(0.32,0.72,0,1),
      border-color 200ms,
      transform 150ms cubic-bezier(0.32,0.72,0,1);
    -webkit-tap-highlight-color: transparent;
  }

  .tile:active { transform: scale(0.94); }

  .tile.pulsing {
    background: color-mix(in srgb, var(--tile-color) 18%, var(--color-surface-1));
    border-color: color-mix(in srgb, var(--tile-color) 45%, transparent);
  }

  .icon {
    color: var(--tile-color);
    display: flex; align-items: center; justify-content: center;
  }
  .icon :global(svg) {
    width: clamp(28px, 2.6vw, 40px);
    height: clamp(28px, 2.6vw, 40px);
  }

  .lbl {
    font-size: clamp(12px, 1.04vw, 15px);
    font-weight: 500; color: var(--color-text-secondary);
    text-align: center; line-height: 1.2;
    max-width: 100%; overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
</style>
