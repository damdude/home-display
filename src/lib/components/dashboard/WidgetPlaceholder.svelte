<script lang="ts">
  /** Subtle empty state for a Home widget whose picked entity isn't in HA. */
  import { CircleSlash } from 'lucide-svelte';
  let { label = '' }: { label?: string } = $props();
</script>

<div class="ph">
  <span class="ph-icon"><CircleSlash size={20} strokeWidth={1.6} /></span>
  <span class="ph-label">{label}</span>
  <span class="ph-sub">Not available</span>
</div>

<style>
  .ph {
    height: 100%; min-height: 56px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px;
    background: var(--color-surface-1);
    border: 1px dashed var(--color-border);
    border-radius: 20px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    color: var(--color-text-tertiary);
  }
  .ph-icon { display: flex; opacity: 0.6; margin-bottom: 2px; }
  .ph-label {
    font-size: 15px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; opacity: 0.7;
  }
  .ph-sub { font-size: 14px; font-style: italic; opacity: 0.5; }
</style>
