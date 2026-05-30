<!--
  ClimateSplit — two-tile climate zone.
  Left tile: current temp display + mode pill + setpoint + humidity.
  Right tile: setpoint +/- controls + heat/cool/auto mode buttons.
  Controls are visual-only this phase (Phase 1b wires them to HA).
-->
<script lang="ts">
  import { Thermometer, Wind, Droplets, Flame, Snowflake, RefreshCw } from 'lucide-svelte';
  import type { ClimateState } from '$lib/data/placeholder.js';

  let { climate }: { climate: ClimateState } = $props();

  type ModeConfig = { label: string; color: string };
  const MODE: Record<string, ModeConfig> = {
    cool:      { label: 'Cooling', color: 'var(--color-accent-info)'    },
    heat:      { label: 'Heating', color: 'var(--color-accent-climate)' },
    heat_cool: { label: 'Auto',    color: 'var(--color-accent-music)'   },
    auto:      { label: 'Auto',    color: 'var(--color-accent-music)'   },
    off:       { label: 'Off',     color: 'var(--color-text-tertiary)'  },
  };

  let mode      = $derived(MODE[climate.state] ?? MODE['off']);
  let isActive  = $derived(
    climate.attributes.hvac_action !== 'idle' && climate.state !== 'off'
  );
  let isHeating = $derived(climate.attributes.hvac_action === 'heating');
  let iconColor = $derived(isActive ? mode.color : 'var(--color-text-tertiary)');

  // Setpoint displayed in the controls tile — cool → high, heat → low, else high
  let setpoint  = $derived(
    climate.state === 'heat'
      ? climate.attributes.target_temp_low
      : climate.attributes.target_temp_high
  );
</script>

<div class="climate">
  <!-- Section label -->
  <div class="section-label">
    <Thermometer size={13} strokeWidth={2} />
    <span>Climate</span>
  </div>

  <div class="tiles">
    <!-- ── Left tile: display ── -->
    <div class="tile tile-display">
      <div class="temp-row">
        <span class="current-temp num">{climate.attributes.current_temperature}°</span>
        <span class="mode-icon" style:color={iconColor} style:opacity={isActive ? '0.9' : '0.4'}>
          {#if isHeating}
            <Thermometer size={28} strokeWidth={1.3} />
          {:else}
            <Wind size={28} strokeWidth={1.3} />
          {/if}
        </span>
      </div>

      <div
        class="mode-pill"
        style:color={mode.color}
        style:background={`color-mix(in srgb, ${mode.color} 14%, transparent)`}
        style:border-color={`color-mix(in srgb, ${mode.color} 28%, transparent)`}
      >
        {mode.label}
      </div>

      <div class="setpoint-range">
        <span class="set-label">Set to</span>
        <span class="set-value num">
          {climate.attributes.target_temp_low}° – {climate.attributes.target_temp_high}°
        </span>
      </div>

      <div class="humidity">
        <span class="hum-icon"><Droplets size={13} strokeWidth={1.8} /></span>
        <span class="num">48%</span>
        <span class="hum-label">Humidity</span>
      </div>
    </div>

    <!-- ── Right tile: controls ── -->
    <div class="tile tile-controls">
      <!-- Setpoint +/- stack -->
      <div class="setpoint-ctrl">
        <button class="adj-btn" aria-label="Increase setpoint">
          <span class="adj-sign">+</span>
        </button>
        <span class="sp-value num">{setpoint}°</span>
        <button class="adj-btn" aria-label="Decrease setpoint">
          <span class="adj-sign">−</span>
        </button>
      </div>

      <!-- Mode buttons: Heat / Cool / Auto -->
      <div class="mode-btns">
        <button
          class="mode-btn"
          class:active={climate.state === 'heat'}
          aria-label="Heat mode"
          title="Heat"
        >
          <Flame size={18} strokeWidth={1.6} />
        </button>
        <button
          class="mode-btn"
          class:active={climate.state === 'cool'}
          aria-label="Cool mode"
          title="Cool"
        >
          <Snowflake size={18} strokeWidth={1.6} />
        </button>
        <button
          class="mode-btn"
          class:active={climate.state === 'heat_cool' || climate.state === 'auto'}
          aria-label="Auto mode"
          title="Auto"
        >
          <RefreshCw size={18} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  /* ── Wrapper ── */
  .climate {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  /* ── Section label ── */
  .section-label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--color-text-tertiary);
    font-size: var(--type-label);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 0.2rem;
  }

  /* ── Two-tile row ── */
  .tiles {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 60fr 40fr;
    gap: 8px;
  }

  /* ── Shared tile shell ── */
  .tile {
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    overflow: hidden;
  }

  /* ── Left: display tile ── */
  .tile-display {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.85rem 1.4rem;
  }

  .temp-row {
    display: flex;
    align-items: center;
    gap: 0.3em;
    line-height: 1;
  }

  .current-temp {
    font-size: var(--type-temp);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
  }

  .mode-icon {
    display: flex;
    align-items: center;
    transition: color 300ms cubic-bezier(0.32, 0.72, 0, 1),
                opacity 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .mode-pill {
    display: inline-flex;
    align-self: flex-start;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid;
    font-size: var(--type-label);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .setpoint-range {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
  }

  .set-label {
    font-size: var(--type-caption);
    color: var(--color-text-tertiary);
    font-weight: 500;
  }

  .set-value {
    font-size: var(--type-h2);
    font-weight: 300;
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
  }

  .humidity {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--color-text-secondary);
    font-size: var(--type-caption);
    opacity: 0.7;
  }

  .hum-icon {
    display: flex;
    align-items: center;
  }

  .hum-label {
    color: var(--color-text-tertiary);
  }

  /* ── Right: controls tile ── */
  .tile-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    padding: 0.7rem 1rem;
  }

  /* Setpoint +/- stack */
  .setpoint-ctrl {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }

  .adj-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 200ms cubic-bezier(0.32, 0.72, 0, 1),
                transform  150ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .adj-btn:active {
    background: var(--color-surface-3);
    transform: scale(0.93);
  }

  .adj-sign {
    font-size: 22px;
    font-weight: 300;
    line-height: 1;
    color: var(--color-text-primary);
    user-select: none;
  }

  .sp-value {
    font-size: clamp(40px, 3.33vw, 52px);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
    line-height: 1;
    padding: 0.1em 0;
  }

  /* Heat / Cool / Auto mode buttons */
  .mode-btns {
    display: flex;
    gap: 10px;
  }

  .mode-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 200ms cubic-bezier(0.32, 0.72, 0, 1),
                color     200ms cubic-bezier(0.32, 0.72, 0, 1),
                transform 150ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .mode-btn.active {
    background: color-mix(in srgb, var(--color-accent-climate) 18%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--color-accent-climate) 35%, transparent);
    color: var(--color-accent-climate);
  }

  .mode-btn:active {
    transform: scale(0.9);
  }
</style>
