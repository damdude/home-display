<script lang="ts">
  import { Thermometer, Droplets, Wind } from 'lucide-svelte';
  import type { ClimateState } from '$lib/data/placeholder.js';

  let { climate }: { climate: ClimateState } = $props();

  type ModeConfig = { label: string; color: string; bg: string };
  const MODE_CONFIG: Record<string, ModeConfig> = {
    cool:      { label: 'Cooling', color: 'var(--color-accent-blue)',   bg: 'var(--color-accent-blue)'   },
    heat:      { label: 'Heating', color: 'var(--color-accent-orange)', bg: 'var(--color-accent-orange)' },
    heat_cool: { label: 'Auto',    color: 'var(--color-accent-purple)', bg: 'var(--color-accent-purple)' },
    auto:      { label: 'Auto',    color: 'var(--color-accent-purple)', bg: 'var(--color-accent-purple)' },
    off:       { label: 'Off',     color: 'var(--color-text-tertiary)', bg: 'var(--color-text-tertiary)' },
  };

  const ACTION_ICONS: Record<string, typeof Thermometer> = {
    cooling: Wind,
    heating: Thermometer,
  };

  let mode        = $derived(MODE_CONFIG[climate.state] ?? MODE_CONFIG['off']);
  let actionIcon  = $derived(ACTION_ICONS[climate.attributes.hvac_action] ?? Thermometer);
  let isActive    = $derived(climate.attributes.hvac_action !== 'idle' && climate.state !== 'off');
</script>

<div class="card">
  <!-- Left: current temp -->
  <div class="left">
    <div class="temp-row">
      <span class="temp num">{climate.attributes.current_temperature}°</span>
      <svelte:component this={actionIcon} size={32} strokeWidth={1.3}
        style:color={isActive ? mode.color : 'var(--color-text-tertiary)'}
        style:opacity={isActive ? '0.9' : '0.5'}
      />
    </div>
    <p class="label">Current Temperature</p>
  </div>

  <!-- Right: mode + setpoint + humidity -->
  <div class="right">
    <!-- Mode pill -->
    <div
      class="mode-pill"
      style:color={mode.color}
      style:background={`color-mix(in srgb, ${mode.bg} 15%, transparent)`}
      style:border-color={`color-mix(in srgb, ${mode.bg} 30%, transparent)`}
    >
      {mode.label}
    </div>

    <div class="setpoint">
      <span class="set-label">Set</span>
      <span class="set-value num">
        {climate.attributes.target_temp_low}° – {climate.attributes.target_temp_high}°
      </span>
    </div>

    <div class="humidity">
      <Droplets size={14} strokeWidth={1.8} />
      <span class="hum-value num">{48}%</span>
      <span class="hum-label">Humidity</span>
    </div>
  </div>
</div>

<style>
  .card {
    height: 100%;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 1.2rem 1.8rem;
    display: flex;
    align-items: center;
    gap: 8%;
  }

  /* Left */
  .left {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
  }

  .temp-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    line-height: 1;
  }

  .temp {
    font-size: var(--type-temp);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
  }

  .label {
    font-size: var(--type-caption);
    color: var(--color-text-tertiary);
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  /* Right */
  .right {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .mode-pill {
    display: inline-flex;
    align-self: flex-start;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid;
    font-size: var(--type-caption);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .setpoint {
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
    gap: 5px;
    color: var(--color-text-secondary);
    font-size: var(--type-caption);
  }

  .hum-value {
    font-weight: 500;
  }

  .hum-label {
    color: var(--color-text-tertiary);
  }
</style>
