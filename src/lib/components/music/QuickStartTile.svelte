<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label:    string;
    color:    string;
    disabled?: boolean;
    onclick?:  () => void;
    children:  Snippet;
  }
  let { label, color, disabled = false, onclick, children }: Props = $props();

  let pressing = $state(false);
  function tap() {
    if (disabled) return;
    pressing = true;
    setTimeout(() => { pressing = false; }, 120);
    onclick?.();
  }
</script>

<button
  class="tile"
  class:pressing
  class:disabled
  style:--c={color}
  {disabled}
  onclick={tap}
  aria-label={label}
>
  <span class="icon">{@render children()}</span>
  <span class="lbl">{label}</span>
</button>

<style>
  .tile {
    flex: 1; min-width: 0;
    height: clamp(52px, 6vh, 68px);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 3px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    cursor: pointer; padding: 6px 4px;
    transition: transform 120ms cubic-bezier(0.32, 0.72, 0, 1),
                background 150ms;
    -webkit-tap-highlight-color: transparent;
  }

  .tile.pressing  { transform: scale(0.94); }
  .tile.disabled  { opacity: 0.35; cursor: default; pointer-events: none; }
  .tile:not(.disabled):active { background: var(--color-surface-2); }

  .icon {
    color: var(--c);
    display: flex; align-items: center; justify-content: center;
    line-height: 1;
  }
  .icon :global(svg) {
    width:  clamp(16px, 1.6vw, 22px);
    height: clamp(16px, 1.6vw, 22px);
  }

  .lbl {
    font-size: clamp(10px, 0.9vw, 13px);
    font-weight: 500;
    color: var(--color-text-secondary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
  }
</style>
