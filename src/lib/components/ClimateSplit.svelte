<!--
  ClimateSplit — two-tile climate zone (60/40 split).
  Left: current temp + mode + setpoint + humidity display.
  Right: setpoint +/- controls + heat/cool/auto mode buttons.
  Controls are visual-only this phase (Phase 1b wires to HA).
-->
<script lang="ts">
  import { Thermometer, Wind, Droplets, Flame, Snowflake, RefreshCw } from 'lucide-svelte';
  import type { ClimateState } from '$lib/data/placeholder.js';

  let {
    climate,
    humidity = null,
    onAdjustSetpoint,
    onSetMode,
  }: {
    climate: ClimateState;
    /** Current humidity % from sensor.living_room_thermostat_current_humidity */
    humidity?: number | null;
    onAdjustSetpoint?: (delta: number) => void;
    onSetMode?: (mode: 'heat' | 'cool' | 'heat_cool') => void;
  } = $props();

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
            <Thermometer size={36} strokeWidth={1.2} />
          {:else}
            <Wind size={36} strokeWidth={1.2} />
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
        <span class="hum-icon"><Droplets size={16} strokeWidth={1.8} /></span>
        <span class="num">{humidity != null ? `${Math.round(humidity)}%` : '–'}</span>
        <span class="hum-label">Humidity</span>
      </div>
    </div>

    <!-- ── Right tile: controls ── -->
    <div class="tile tile-controls">
      <div class="setpoint-ctrl">
        <button class="adj-btn" aria-label="Increase setpoint" onclick={() => onAdjustSetpoint?.(1)}>
          <span class="adj-sign">+</span>
        </button>
        <span class="sp-value num">{setpoint}°</span>
        <button class="adj-btn" aria-label="Decrease setpoint" onclick={() => onAdjustSetpoint?.(-1)}>
          <span class="adj-sign">−</span>
        </button>
      </div>

      <div class="mode-btns">
        <button
          class="mode-btn"
          class:active={climate.state === 'heat'}
          aria-label="Heat mode"
          title="Heat"
          onclick={() => onSetMode?.('heat')}
        >
          <Flame size={24} strokeWidth={1.5} />
        </button>
        <button
          class="mode-btn"
          class:active={climate.state === 'cool'}
          aria-label="Cool mode"
          title="Cool"
          onclick={() => onSetMode?.('cool')}
        >
          <Snowflake size={24} strokeWidth={1.5} />
        </button>
        <button
          class="mode-btn"
          class:active={climate.state === 'heat_cool' || climate.state === 'auto'}
          aria-label="Auto mode"
          title="Auto"
          onclick={() => onSetMode?.('heat_cool')}
        >
          <RefreshCw size={24} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .climate {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

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

  .tiles {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 60fr 40fr;
    gap: 8px;
  }

  .tile {
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    overflow: hidden;
  }

  /* ── Left: display ── */
  .tile-display {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.9rem 1.5rem;
  }

  .temp-row {
    display: flex;
    align-items: center;
    gap: 0.3em;
    line-height: 1;
  }

  /* Current temp: 72-84px — fills the left tile */
  .current-temp {
    font-size: clamp(56px, 5.83vw, 84px);
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
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid;
    font-size: clamp(14px, 1.67vw, 22px);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .setpoint-range {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
  }

  .set-label {
    font-size: clamp(14px, 1.48vw, 22px);
    color: var(--color-text-tertiary);
    font-weight: 500;
  }

  .set-value {
    font-size: clamp(16px, 1.85vw, 26px);
    font-weight: 300;
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
  }

  .humidity {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--color-text-secondary);
    font-size: clamp(14px, 1.48vw, 22px);
    opacity: 0.7;
  }

  .hum-icon { display: flex; align-items: center; }
  .hum-label { color: var(--color-text-tertiary); }

  /* ── Right: controls ── */
  .tile-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.7rem 1rem;
  }

  .setpoint-ctrl {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  /* +/- buttons: 64-72px — big enough to tap confidently */
  .adj-btn {
    width: clamp(56px, 5.00vw, 72px);
    height: clamp(56px, 5.00vw, 72px);
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
    font-size: clamp(20px, 1.85vw, 26px);
    font-weight: 300;
    line-height: 1;
    color: var(--color-text-primary);
    user-select: none;
  }

  /* Setpoint value: 72-84px */
  .sp-value {
    font-size: clamp(56px, 5.83vw, 84px);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
    line-height: 1;
    padding: 0.08em 0;
  }

  /* Heat/Cool/Auto: 52-60px diameter */
  .mode-btns {
    display: flex;
    gap: 10px;
  }

  .mode-btn {
    width: clamp(46px, 4.17vw, 60px);
    height: clamp(46px, 4.17vw, 60px);
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

  .mode-btn:active { transform: scale(0.9); }
</style>
