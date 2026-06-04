<script lang="ts">
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';

  const CLIMATE   = 'climate.living_room_thermostat';
  const TEMP_SEN  = 'sensor.living_room_thermostat_current_temperature';
  const HUM_SEN   = 'sensor.living_room_thermostat_current_humidity';

  const MODE_LABELS: Record<string, string> = {
    heat:      'Heat',
    cool:      'Cool',
    heat_cool: 'Auto',
    auto:      'Auto',
    off:       'Off',
    dry:       'Dry',
    fan_only:  'Fan',
  };

  const MODE_COLORS: Record<string, string> = {
    heat:      'var(--color-accent-alert)',
    cool:      'var(--color-accent-info)',
    heat_cool: 'var(--color-accent-safe)',
    auto:      'var(--color-accent-safe)',
    off:       'var(--color-text-tertiary)',
  };

  let climateEnt  = $derived(haStore.entities[CLIMATE]);
  let tempEnt     = $derived(haStore.entities[TEMP_SEN]);
  let humEnt      = $derived(haStore.entities[HUM_SEN]);

  let currentTemp = $derived(tempEnt?.state != null ? parseFloat(tempEnt.state) : null);
  let humidity    = $derived(humEnt?.state  != null ? Math.round(parseFloat(humEnt.state)) : null);
  let hvacMode    = $derived((climateEnt?.state ?? 'off') as string);

  // Target setpoint — single temp for heat/cool, or high for auto
  let setpoint = $derived.by(() => {
    const a = climateEnt?.attributes ?? {};
    if (hvacMode === 'heat_cool' || hvacMode === 'auto') {
      return (a.target_temp_high ?? a.temperature ?? null) as number | null;
    }
    return (a.temperature ?? null) as number | null;
  });

  function adjustTemp(delta: number) {
    if (!setpoint) return;
    callHaService('climate', 'set_temperature', {
      entity_id: CLIMATE,
      temperature: setpoint + delta,
    });
  }

  function setMode(mode: string) {
    callHaService('climate', 'set_hvac_mode', {
      entity_id: CLIMATE,
      hvac_mode: mode,
    });
  }

  const MODES = ['heat', 'cool', 'heat_cool', 'off'];
</script>

<div class="climate-section">
  <!-- Temp + humidity -->
  <div class="temp-row">
    <span class="temp-big">
      {currentTemp != null ? Math.round(currentTemp) : '–'}°
    </span>
    {#if humidity != null}
      <span class="humidity-badge">{humidity}% RH</span>
    {/if}
  </div>

  <!-- Setpoint control -->
  {#if hvacMode !== 'off'}
    <div class="setpoint-row">
      <button class="adj-btn" onclick={() => adjustTemp(-1)} aria-label="Decrease temperature">−</button>
      <span class="setpoint-val">{setpoint != null ? Math.round(setpoint) : '–'}°</span>
      <button class="adj-btn" onclick={() => adjustTemp(+1)} aria-label="Increase temperature">+</button>
    </div>
  {/if}

  <!-- Mode buttons -->
  <div class="mode-row">
    {#each MODES as mode}
      <button
        class="mode-btn"
        class:active={hvacMode === mode || (mode === 'heat_cool' && hvacMode === 'auto')}
        style:--mc={MODE_COLORS[mode] ?? 'var(--color-text-tertiary)'}
        onclick={() => setMode(mode)}
      >
        {MODE_LABELS[mode] ?? mode}
      </button>
    {/each}
  </div>
</div>

<style>
  .climate-section { display: flex; flex-direction: column; gap: 0.55rem; }

  .temp-row { display: flex; align-items: baseline; gap: 10px; }

  .temp-big {
    font-size: clamp(48px, 5vw, 72px);
    font-weight: 300; letter-spacing: -0.02em;
    color: var(--color-text-primary); line-height: 1;
  }

  .humidity-badge {
    font-size: clamp(12px, 1.04vw, 15px); font-weight: 500;
    color: var(--color-text-tertiary);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    padding: 2px 8px; border-radius: 999px;
  }

  .setpoint-row {
    display: flex; align-items: center; gap: 14px;
  }

  .adj-btn {
    width: 36px; height: 36px; border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-primary);
    font-size: 20px; cursor: pointer; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    transition: background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .adj-btn:active { background: var(--color-surface-3); }

  .setpoint-val {
    font-size: clamp(22px, 2.2vw, 30px); font-weight: 500;
    color: var(--color-text-primary); min-width: 3ch; text-align: center;
  }

  .mode-row { display: flex; gap: 6px; flex-wrap: wrap; }

  .mode-btn {
    padding: 5px 14px; border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-tertiary);
    font-size: clamp(13px, 1.11vw, 16px); font-weight: 500;
    cursor: pointer;
    transition: background 150ms, color 150ms, border-color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .mode-btn.active {
    background: color-mix(in srgb, var(--mc) 16%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--mc) 40%, transparent);
    color: var(--mc);
    font-weight: 600;
  }
  .mode-btn:not(.active):active { background: var(--color-surface-3); }
</style>
