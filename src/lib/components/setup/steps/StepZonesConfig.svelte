<script lang="ts">
  import { zonesStore } from '$lib/stores/zonesStore.svelte.js';

  interface Props {
    hiddenAreaIds: string[];
    onBack:        () => void;
    onContinue:    () => void;
  }
  let { hiddenAreaIds = $bindable([]), onBack, onContinue }: Props = $props();

  // Collect all zone area IDs from loaded floors
  let allZones = $derived(
    zonesStore.floors.flatMap(f =>
      f.zones.map(z => ({ areaId: z.areaId, name: z.name, floor: f.name }))
    )
  );

  function toggle(areaId: string) {
    if (hiddenAreaIds.includes(areaId)) {
      hiddenAreaIds = hiddenAreaIds.filter(id => id !== areaId);
    } else {
      hiddenAreaIds = [...hiddenAreaIds, areaId];
    }
  }

  let visibleCount = $derived(allZones.filter(z => !hiddenAreaIds.includes(z.areaId)).length);
</script>

<div class="step">
  <div class="header">
    <h1>Zones tab setup</h1>
    <p>
      {allZones.length} zone{allZones.length !== 1 ? 's' : ''} found in Home Assistant.
      Uncheck any you don't want to show.
    </p>
  </div>

  {#if zonesStore.loading}
    <div class="connecting">
      <div class="spinner"></div>
      <p>Loading zones…</p>
    </div>
  {:else if allZones.length === 0}
    <div class="empty-state">
      <p>No zones found. Areas can be configured in Home Assistant Settings → Areas.</p>
    </div>
  {:else}

    <div class="zone-list">
      {#each allZones as zone}
        {@const visible = !hiddenAreaIds.includes(zone.areaId)}
        <button class="zone-row" class:visible onclick={() => toggle(zone.areaId)}>
          <span class="checkbox" class:on={visible}>{visible ? '✓' : ''}</span>
          <div class="zone-text">
            <span class="zone-name">{zone.name}</span>
            <span class="zone-floor">{zone.floor}</span>
          </div>
        </button>
      {/each}
    </div>

    <p class="summary">{visibleCount} zone{visibleCount !== 1 ? 's' : ''} will be shown.</p>

  {/if}

  <div class="footer">
    <button class="btn-ghost" onclick={onBack}>← Back</button>
    <button class="btn-primary" onclick={onContinue}>Continue →</button>
  </div>
</div>

<style>
  .step { height: 100%; display: flex; flex-direction: column; padding: clamp(24px, 4vh, 48px) clamp(24px, 5vw, 60px); gap: clamp(20px, 3vh, 36px); }
  .header h1 { font-size: clamp(28px, 3.5vw, 48px); font-weight: 700; color: var(--color-text-primary); margin: 0 0 8px; }
  .header p  { font-size: clamp(14px, 1.5vw, 20px); color: var(--color-text-secondary); margin: 0; }

  .connecting, .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--color-text-secondary); font-size: clamp(15px, 1.6vw, 20px); text-align: center; }
  .spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--color-accent-music); animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .zone-list { display: flex; flex-direction: column; gap: 8px; flex: 1; max-width: 560px; overflow-y: auto; scrollbar-width: none; }
  .zone-list::-webkit-scrollbar { display: none; }

  .zone-row {
    display: flex; align-items: center; gap: 12px;
    padding: clamp(10px, 1.4vh, 16px) 14px;
    border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.07);
    background: var(--color-surface-1); cursor: pointer; text-align: left; width: 100%;
    transition: border-color 150ms, background 150ms, opacity 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .zone-row.visible { border-color: color-mix(in srgb, var(--color-accent-safe) 40%, transparent); }
  .zone-row:not(.visible) { opacity: 0.45; }

  .checkbox { width: 22px; height: 22px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: transparent; flex-shrink: 0; transition: all 150ms; }
  .checkbox.on { background: var(--color-accent-safe); border-color: var(--color-accent-safe); color: #fff; }

  .zone-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }
  .zone-name { font-size: clamp(14px, 1.4vw, 18px); font-weight: 600; color: var(--color-text-primary); }
  .zone-floor { font-size: clamp(11px, 1vw, 14px); color: var(--color-text-tertiary); }

  .summary { font-size: clamp(13px, 1.2vw, 16px); color: var(--color-text-tertiary); margin: 0; font-style: italic; }

  .footer { display: flex; gap: 12px; margin-top: auto; }
  .btn-primary { flex: 2; padding: clamp(14px, 2vh, 20px); background: var(--color-accent-music); color: #fff; border: none; border-radius: 12px; font-size: clamp(16px, 1.7vw, 22px); font-weight: 600; cursor: pointer; transition: opacity 150ms, transform 100ms; -webkit-tap-highlight-color: transparent; }
  .btn-primary:not(:disabled):active { transform: scale(0.97); }
  .btn-ghost { flex: 1; padding: clamp(14px, 2vh, 20px); background: rgba(255,255,255,0.07); color: var(--color-text-secondary); border: none; border-radius: 12px; font-size: clamp(16px, 1.7vw, 22px); font-weight: 500; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 150ms; }
  .btn-ghost:active { background: rgba(255,255,255,0.12); }
</style>
