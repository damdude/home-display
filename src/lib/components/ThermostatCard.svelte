<script lang="ts">
  import { Thermometer, Droplets, Wind } from 'lucide-svelte';
  import type { ClimateState } from '$lib/data/placeholder.js';

  let { climate }: { climate: ClimateState } = $props();

  type ModeConfig = { label: string; color: string };
  const MODE: Record<string, ModeConfig> = {
    cool:      { label: 'Cooling', color: 'var(--color-accent-blue)'   },
    heat:      { label: 'Heating', color: 'var(--color-accent-orange)' },
    heat_cool: { label: 'Auto',    color: 'var(--color-accent-purple)' },
    auto:      { label: 'Auto',    color: 'var(--color-accent-purple)' },
    off:       { label: 'Off',     color: 'var(--color-text-tertiary)' },
  };

  let mode       = $derived(MODE[climate.state] ?? MODE['off']);
  let isActive   = $derived(
    climate.attributes.hvac_action !== 'idle' && climate.state !== 'off'
  );
  let iconColor  = $derived(isActive ? mode.color : 'var(--color-text-tertiary)');
  let iconOpacity = $derived(isActive ? '0.9' : '0.45');
  let isHeating  = $derived(climate.attributes.hvac_action === 'heating');
</script>

<div class="card">
  <!-- Left: current temp + active-mode icon -->
  <div class="left">
    <div class="temp-row">
      <span class="temp num">{climate.attributes.current_temperature}°</span>
      <!-- Wrap icon in span so style: directives apply to the HTML element, not the component -->
      <span class="action-icon" style:color={iconColor} style:opacity={iconOpacity}>
        {#if isHeating}
          <Thermometer size={32} strokeWidth={1.3} />
        {:else}
          <Wind size={32} strokeWidth={1.3} />
        {/if}
      </span>
    </div>
    <p class="sub">Current Temperature</p>
  </div>

  <!-- Right: mode pill + setpoint + humidity -->
  <div class="right">
    <div
      class="mode-pill"
      style:color={mode.color}
      style:background={`color-mix(in srgb, ${mode.color} 15%, transparent)`}
      style:border-color={`color-mix(in srgb, ${mode.color} 30%, transparent)`}
    >
      {mode.label}
    </div>

    <div class="setpoint">
      <span class="set-label">Set to</span>
      <span class="set-value num">
        {climate.attributes.target_temp_low}° – {climate.attributes.target_temp_high}°
      </span>
    </div>

    <div class="humidity">
      <Droplets size={14} strokeWidth={1.8} />
      <span class="num">48%</span>
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
    padding: 1rem 1.8rem;
    display: flex;
    align-items: center;
    gap: 8%;
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
  }

  .temp-row {
    display: flex;
    align-items: center;
    gap: 0.35em;
    line-height: 1;
  }

  .temp {
    font-size: var(--type-temp);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
  }

  .action-icon {
    display: flex;
    align-items: center;
    transition: color 300ms cubic-bezier(0.32, 0.72, 0, 1),
                opacity 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .sub {
    font-size: var(--type-caption);
    color: var(--color-text-tertiary);
    margin: 0;
    font-weight: 500;
  }

  .right {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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

  .hum-label {
    color: var(--color-text-tertiary);
  }
</style>
