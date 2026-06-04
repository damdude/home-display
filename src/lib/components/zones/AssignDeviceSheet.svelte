<script lang="ts">
  /**
   * Bottom sheet for assigning an unassigned device to a room.
   * Same floating-card style as CastPicker.
   */
  import { fly, fade } from 'svelte/transition';
  import { cubicOut }  from 'svelte/easing';
  import {
    Sofa, Baby, Trees, Shield, Car, UtensilsCrossed, Bed, Droplets,
    LayoutGrid, HelpCircle,
  } from 'lucide-svelte';
  import { zonesStore } from '$lib/stores/zonesStore.svelte.js';

  interface Props {
    open:      boolean;
    entityId:  string | null;
    onAssign:  (areaId: string | null) => void;
    onClose:   () => void;
    assigning: boolean;
  }
  let { open, entityId, onAssign, onClose, assigning }: Props = $props();

  // Mirror of ZONE_ICONS in ZoneCard
  const ZONE_ICONS: Record<string, typeof Sofa> = {
    living_room:     Sofa,
    kids_room:       Baby,
    outdoor:         Trees,
    home:            Shield,
    garage:          Car,
    kitchen:         UtensilsCrossed,
    master_room:     Bed,
    master_bathroom: Droplets,
    guest_room:      Bed,
    guest_bathroom:  Droplets,
    powder_room:     Droplets,
  };
  const ZONE_NAMES: Record<string, string> = {
    living_room:     'Living Room',
    kids_room:       'Kids Room',
    outdoor:         'Outdoor',
    home:            'Security',
    garage:          'Garage',
    kitchen:         'Kitchen',
    master_room:     'Master Room',
    master_bathroom: 'Master Bath',
    guest_room:      'Guest Room',
    guest_bathroom:  'Guest Bath',
    powder_room:     'Powder Room',
  };
</script>

{#if open}
  <!-- Scrim -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={onClose}></div>

  <!-- Floating card — slides up above bottom nav -->
  <div
    class="card"
    role="dialog"
    aria-label="Assign to room"
    aria-modal="true"
    transition:fly={{ y: 300, duration: 350, easing: cubicOut }}
  >
    <!-- Header -->
    <div class="header">
      <div class="header-text">
        <p class="sheet-title">Assign to Room</p>
        {#if entityId}
          <p class="sheet-sub">{entityId}</p>
        {/if}
      </div>
      <button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
    </div>

    <div class="divider"></div>

    <!-- Scrollable area list -->
    <div class="area-list">
      {#each zonesStore.floors as floor}
        <p class="floor-label">{floor.name.toUpperCase()}</p>
        {#each floor.zones as zone}
          {@const Icon = ZONE_ICONS[zone.areaId] ?? LayoutGrid}
          {@const label = ZONE_NAMES[zone.areaId] ?? zone.name}
          <button
            class="area-row"
            disabled={assigning}
            onclick={() => onAssign(zone.areaId)}
          >
            <span class="area-icon"><Icon size={18} strokeWidth={1.6} /></span>
            <span class="area-name">{label}</span>
            {#if assigning}
              <span class="spinner">…</span>
            {/if}
          </button>
        {/each}
      {/each}

      <div class="divider divider-inner"></div>

      <!-- Remove assignment -->
      <button
        class="area-row unassign-row"
        disabled={assigning}
        onclick={() => onAssign(null)}
      >
        <span class="area-icon"><HelpCircle size={18} strokeWidth={1.6} /></span>
        <span class="area-name unassign-label">Remove assignment</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 120;
    background: rgba(0, 0, 0, 0.55);
  }

  .card {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    width: min(85vw, 480px);
    max-height: 65vh;
    border-radius: 20px;
    z-index: 121;
    background: rgba(28, 28, 32, 0.97);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.09);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 16px 16px 0;
  }

  .header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 12px; padding-bottom: 14px; flex-shrink: 0;
  }

  .header-text { flex: 1; min-width: 0; }

  .sheet-title {
    font-size: clamp(15px, 1.39vw, 19px); font-weight: 600;
    color: var(--color-text-primary); margin: 0;
  }

  .sheet-sub {
    font-size: clamp(11px, 1vw, 14px); color: var(--color-text-tertiary);
    margin: 2px 0 0; opacity: 0.72;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .close-btn {
    border: none; background: none; cursor: pointer; flex-shrink: 0;
    font-size: 16px; line-height: 1;
    color: var(--color-text-tertiary); padding: 4px 8px;
    border-radius: 6px;
    -webkit-tap-highlight-color: transparent;
  }
  .close-btn:active { background: rgba(255,255,255,0.06); }

  .divider {
    height: 1px; background: rgba(255,255,255,0.07);
    margin: 0 -16px; flex-shrink: 0;
  }
  .divider-inner { margin: 4px -16px 0; }

  /* Area list */
  .area-list {
    display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto; scrollbar-width: none;
    flex: 1; padding-bottom: 12px;
  }
  .area-list::-webkit-scrollbar { display: none; }

  .floor-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--color-text-tertiary);
    opacity: 0.6; margin: 8px 0 4px;
    padding: 0 4px;
    flex-shrink: 0;
  }

  .area-row {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 8px; border-radius: 14px;
    background: transparent; border: none; cursor: pointer;
    width: 100%; text-align: left;
    color: var(--color-text-primary);
    font-size: clamp(15px, 1.39vw, 19px); font-weight: 500;
    transition: background 140ms;
    -webkit-tap-highlight-color: transparent;
  }
  .area-row:not(:disabled):active { background: rgba(255,255,255,0.05); }
  .area-row:disabled { opacity: 0.5; cursor: default; }

  .area-icon {
    color: var(--color-text-secondary); flex-shrink: 0;
    display: flex; align-items: center;
  }

  .area-name {
    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .unassign-row { opacity: 0.6; }
  .unassign-label { color: var(--color-text-tertiary); font-size: 0.9em; }

  .spinner {
    color: var(--color-text-tertiary); font-size: 14px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { opacity: 0.2; } }
</style>
