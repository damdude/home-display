<script lang="ts">
  import { DoorOpen, DoorClosed } from 'lucide-svelte';
  import { attentionPulse } from '$lib/actions/attentionPulse.js';
  import { raw, radius } from '$lib/design/tokens.js';
  import type { BinarySensorState } from '$lib/data/placeholder.js';

  let {
    entity,
    pulseCount = 0,
  }: {
    entity:     BinarySensorState;
    pulseCount?: number;
  } = $props();

  let isOpen      = $derived(entity.state === 'on');
  let accent      = $derived(isOpen ? 'var(--color-accent-red)' : 'var(--color-accent-green)');
  let pulseColor  = $derived(isOpen ? raw.accent.red : raw.accent.green);
</script>

<div
  class="tile"
  use:attentionPulse={{ count: pulseCount, color: pulseColor, radius: radius.small }}
>
  <div class="icon" style:color={accent}>
    {#if isOpen}
      <DoorOpen size={36} strokeWidth={1.4} />
    {:else}
      <DoorClosed size={36} strokeWidth={1.4} />
    {/if}
  </div>
  <p class="name">{entity.attributes.friendly_name}</p>
  <p class="state" style:color={accent}>{isOpen ? 'Open' : 'Closed'}</p>
</div>

<style>
  .tile {
    position: relative;
    background: var(--color-surface-1);
    border-radius: 20px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.8rem 0.5rem;
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.85;
  }

  .name {
    font-size: var(--type-caption);
    font-weight: 600;
    color: var(--color-text-secondary);
    margin: 0;
    text-align: center;
    letter-spacing: 0.01em;
  }

  .state {
    font-size: var(--type-caption);
    font-weight: 700;
    margin: 0;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    font-size: 11px;
  }
</style>
