<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    color = 'var(--color-accent-light)',
    onclick,
    children,
  }: {
    label:    string;
    color?:   string;
    onclick?: () => void;
    children?: Snippet;
  } = $props();
</script>

<button class="shortcut" {onclick} style:--sc-color={color} aria-label={label}>
  <div class="icon-circle">
    {@render children?.()}
  </div>
  <span class="label">{label}</span>
</button>

<style>
  .shortcut {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    background: none;
    border: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .icon-circle {
    /* 80-88px — fills the 9% zone height comfortably */
    width: clamp(72px, 6.11vw, 88px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: color-mix(in srgb, var(--sc-color) 16%, var(--color-surface-1));
    border: 1px solid color-mix(in srgb, var(--sc-color) 28%, transparent);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sc-color);
    transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1),
                background 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .shortcut:active .icon-circle {
    transform: scale(0.92);
    background: color-mix(in srgb, var(--sc-color) 24%, var(--color-surface-1));
  }

  .label {
    font-size: clamp(14px, 1.39vw, 20px);
    font-weight: 500;
    color: var(--color-text-secondary);
    text-align: center;
    white-space: nowrap;
  }
</style>
