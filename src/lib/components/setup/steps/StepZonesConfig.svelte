<script lang="ts">
  import { zonesStore } from '$lib/stores/zonesStore.svelte.js';

  interface Props {
    hiddenAreaIds: string[];
    onBack:        () => void;
    onContinue:    () => void;
  }
  let { hiddenAreaIds = $bindable([]), onBack, onContinue }: Props = $props();

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
  <div class="step-header">
    <h1>Zones tab setup</h1>
    <p>Uncheck any rooms you don't want to show.</p>
  </div>

  <div class="step-body">
    {#if zonesStore.loading}
      <div class="connecting">
        <div class="spinner"></div>
        <p>Loading zones…</p>
      </div>
    {:else if allZones.length === 0}
      <div class="connecting">
        <p>No zones found. Set up areas in Home Assistant → Settings → Areas.</p>
      </div>
    {:else}
      <div class="content-list">
        {#each allZones as zone}
          {@const visible = !hiddenAreaIds.includes(zone.areaId)}
          <button class="option-row" class:selected={visible} onclick={() => toggle(zone.areaId)}>
            <span class="check" class:on={visible}>{visible ? '✓' : ''}</span>
            <div class="zone-text">
              <span class="zone-name">{zone.name}</span>
              <span class="zone-floor">{zone.floor}</span>
            </div>
          </button>
        {/each}
        <p class="summary">{visibleCount} zone{visibleCount !== 1 ? 's' : ''} will be shown</p>
      </div>
    {/if}
  </div>

  <div class="step-footer">
    <button class="btn btn-back" onclick={onBack}>← Back</button>
    <button class="btn btn-continue" onclick={onContinue}>Continue →</button>
  </div>
</div>

<style>
  .step {
    height: 100%; display: flex; flex-direction: column;
    background: #000; color: #fff; isolation: isolate;
  }

  .step-header {
    flex-shrink: 0;
    padding: 44px 36px 20px;
    text-align: center;
  }
  .step-header h1 { font-size: 46px; font-weight: 700; margin: 0; color: #fff; line-height: 1.15; }
  .step-header p  { font-size: 20px; color: rgba(255,255,255,0.45); margin: 8px 0 0; }

  .step-body {
    flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;
    padding: 16px 32px; overflow-y: auto; -webkit-overflow-scrolling: touch;
    touch-action: pan-y; -webkit-user-select: none; user-select: none;
    scrollbar-width: none;
  }
  .step-body::-webkit-scrollbar { display: none; }

  .connecting {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    color: rgba(255,255,255,0.4); font-size: 20px; text-align: center;
  }
  .connecting p { margin: 0; }
  .spinner {
    width: 52px; height: 52px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: rgba(255,255,255,0.7);
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .content-list {
    display: flex; flex-direction: column; gap: 14px;
    width: 100%; max-width: 760px;
  }

  .option-row {
    display: flex; align-items: center; gap: 16px;
    padding: 24px 28px;
    background: #111;
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    cursor: pointer; text-align: left; width: 100%;
    transition: border-color 150ms, background 150ms, opacity 150ms;
    -webkit-tap-highlight-color: transparent;
    min-height: 92px;
  }
  .option-row.selected {
    border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.09);
  }
  .option-row:not(.selected) { opacity: 0.4; }
  .option-row:active { transform: scale(0.99); }

  .check {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    border: 1.5px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700; color: transparent; transition: all 150ms;
  }
  .check.on { background: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.9); color: #000; }

  .zone-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .zone-name  { font-size: 28px; font-weight: 600; color: #fff; }
  .zone-floor { font-size: 18px; color: rgba(255,255,255,0.35); }

  .summary {
    font-size: 18px; color: rgba(255,255,255,0.3);
    margin: 4px 0 0; text-align: center;
  }

  .step-footer {
    flex-shrink: 0; display: flex; gap: 16px;
    padding: 24px 32px; background: #000;
    border-top: 1px solid rgba(255,255,255,0.07);
  }

  .btn {
    flex: 1; padding: 28px; border: none; border-radius: 18px;
    font-size: 26px; font-weight: 700; cursor: pointer;
    min-height: 92px; transition: opacity 120ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-back { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.55); }
  .btn-back:active { background: rgba(255,255,255,0.12); }
  .btn-continue { background: #fff; color: #000; }
  .btn-continue:active { transform: scale(0.98); }
</style>
