<script lang="ts">
  import { Lightbulb } from 'lucide-svelte';
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';
  import type { ZoneEntity } from '$lib/stores/zonesStore.svelte.js';

  interface Props { entities: ZoneEntity[]; }
  let { entities }: Props = $props();

  // Hardcoded outdoor lights entity
  const OUTDOOR_LIGHTS = 'switch.outdoor_lights_outlet1';

  const LIGHT_LABELS: Record<string, string> = {
    [OUTDOOR_LIGHTS]: 'Outdoor Lights',
  };

  function labelFor(entityId: string): string {
    return LIGHT_LABELS[entityId]
      ?? entityId.replace(/^(switch|light)\./, '').replace(/_/g, ' ')
           .replace(/\b\w/g, c => c.toUpperCase());
  }

  function toggle(entityId: string) {
    const domain = entityId.split('.')[0];
    const state  = haStore.entities[entityId]?.state;
    const svc    = state === 'on' ? 'turn_off' : 'turn_on';
    callHaService(domain, svc, { entity_id: entityId });
  }
</script>

<div class="lights-section">
  {#each entities as light (light.entity_id)}
    {@const on = haStore.entities[light.entity_id]?.state === 'on'}
    <div class="light-row">
      <span class="bulb-icon" class:on>
        <Lightbulb size={20} strokeWidth={1.5} />
      </span>
      <span class="light-label">{labelFor(light.entity_id)}</span>
      <!-- Toggle switch -->
      <button
        class="toggle"
        class:on
        onclick={() => toggle(light.entity_id)}
        role="switch"
        aria-checked={on}
        aria-label="{labelFor(light.entity_id)} {on ? 'on' : 'off'}"
      >
        <span class="toggle-thumb"></span>
      </button>
    </div>
  {/each}
</div>

<style>
  .lights-section { display: flex; flex-direction: column; gap: 6px; }

  .light-row {
    display: flex; align-items: center; gap: 12px;
    padding: 4px 0;
  }

  .bulb-icon {
    color: var(--color-text-tertiary); opacity: 0.5;
    flex-shrink: 0; display: flex; align-items: center;
    transition: color 200ms, opacity 200ms;
  }
  .bulb-icon.on { color: var(--color-accent-light); opacity: 1; }

  .light-label {
    flex: 1;
    font-size: clamp(15px, 1.39vw, 20px); font-weight: 500;
    color: var(--color-text-primary);
  }

  /* iOS-style toggle */
  .toggle {
    position: relative; flex-shrink: 0;
    width: 48px; height: 28px; border-radius: 14px;
    border: none; cursor: pointer; padding: 0;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    transition: background 250ms cubic-bezier(0.32,0.72,0,1),
                border-color 250ms;
    -webkit-tap-highlight-color: transparent;
  }
  .toggle.on {
    background: var(--color-accent-safe);
    border-color: var(--color-accent-safe);
  }

  .toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(255,255,255,0.9);
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    transition: transform 250ms cubic-bezier(0.32,0.72,0,1);
    pointer-events: none;
  }
  .toggle.on .toggle-thumb { transform: translateX(20px); }
</style>
