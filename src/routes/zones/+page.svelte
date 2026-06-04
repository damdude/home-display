<script lang="ts">
  import { onMount } from 'svelte';
  import { page }    from '$app/stores';
  import { LayoutGrid, Home, Building2, HelpCircle } from 'lucide-svelte';
  import { zonesStore } from '$lib/stores/zonesStore.svelte.js';
  import ZoneCard from '$lib/components/zones/ZoneCard.svelte';

  let unassignedRef = $state<HTMLElement | null>(null);

  onMount(() => {
    if ($page.url.searchParams.get('section') === 'unassigned') {
      setTimeout(() => {
        unassignedRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300); // wait for page transition to settle
    }
  });

  const FLOOR_ICONS: Record<string, typeof Home> = {
    ground_floor: Home,
    '1st_floor':  Building2,
    __other__:    LayoutGrid,
  };

  const FLOOR_LABELS: Record<string, string> = {
    ground_floor: 'Ground Floor',
    '1st_floor':  '1st Floor',
    __other__:    'Other',
  };
</script>

<div class="zones-page">
  <!-- Section header -->
  <div class="page-header">
    <span class="header-icon"><LayoutGrid size={24} strokeWidth={1.5} /></span>
    <div class="header-text">
      <h1 class="header-title">Zones</h1>
      <p class="header-sub">All rooms</p>
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    {#if zonesStore.loading}
      {#each [1, 2, 3] as _}
        <div class="skeleton-card" aria-hidden="true"></div>
      {/each}
    {:else}
      <!-- Floor-grouped zone cards -->
      {#each zonesStore.floors as floor (floor.floor_id)}
        {@const FloorIcon = FLOOR_ICONS[floor.floor_id] ?? LayoutGrid}
        {@const floorLabel = FLOOR_LABELS[floor.floor_id] ?? floor.name}

        <div class="floor-section">
          <div class="floor-header">
            <span class="floor-icon"><FloorIcon size={14} strokeWidth={2} /></span>
            <span class="floor-label">{floorLabel.toUpperCase()}</span>
          </div>

          <div class="zone-list">
            {#each floor.zones as zone (zone.areaId)}
              <ZoneCard {zone} />
            {/each}
          </div>
        </div>
      {/each}

      <!-- Unassigned devices (if any) -->
      {#if zonesStore.unassigned}
        <div class="floor-section" bind:this={unassignedRef}>
          <div class="floor-header">
            <span class="floor-icon"><HelpCircle size={14} strokeWidth={2} /></span>
            <span class="floor-label">UNASSIGNED</span>
          </div>
          <div class="zone-list">
            <ZoneCard zone={zonesStore.unassigned} />
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .zones-page {
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: clamp(8px, 1vh, 12px) 5vw;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Page header */
  .page-header {
    display: flex; align-items: center; gap: 10px;
    padding: clamp(4px, 0.5vh, 8px) 0 clamp(12px, 1.4vh, 18px);
    flex-shrink: 0;
  }

  .header-icon {
    color: var(--color-accent-info); opacity: 0.85;
    display: flex; align-items: center;
  }

  .header-text { display: flex; flex-direction: column; gap: 1px; }

  .header-title {
    font-size: clamp(22px, 2.2vw, 32px);
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
    margin: 0; line-height: 1.1;
  }

  .header-sub {
    font-size: clamp(11px, 0.97vw, 14px);
    color: var(--color-text-tertiary);
    margin: 0;
  }

  /* Content area */
  .content {
    display: flex;
    flex-direction: column;
    gap: clamp(16px, 2vh, 24px);
    padding-bottom: clamp(8px, 1vh, 14px);
  }

  /* Floor section */
  .floor-section {
    display: flex; flex-direction: column; gap: clamp(8px, 1vh, 12px);
  }

  .floor-header {
    display: flex; align-items: center; gap: 6px;
    padding: 0 2px;
  }

  .floor-icon {
    color: var(--color-text-tertiary); opacity: 0.7;
    display: flex; align-items: center;
  }

  .floor-label {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--color-text-tertiary);
  }

  /* Zone list within a floor */
  .zone-list {
    display: flex; flex-direction: column;
    gap: clamp(8px, 1vh, 12px);
  }

  /* Loading skeletons */
  .skeleton-card {
    height: 100px;
    border-radius: 20px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    animation: pulse 1.6s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
</style>
