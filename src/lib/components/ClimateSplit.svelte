<!--
  ClimateSplit — two-tile climate zone (35/65 split).

  Left tile (narrower): current temp · mode pill · setpoint range · humidity.
  Right tile (wider):
    Top row:   [−]  [setpoint value]  [+]   (horizontal; disabled when off)
    Bottom row: [Heat] [Cool] [Auto] [Off]  (mode buttons with labels)

  Temperature attributes by mode:
    heat / cool  → entity.attributes.temperature  (single value)
    heat_cool / auto → entity.attributes.target_temp_low / target_temp_high
    off          → no setpoint; +/− disabled
-->
<script lang="ts">
  import {
    Thermometer, Wind, Droplets,
    Flame, Snowflake, RefreshCw, Power,
  } from 'lucide-svelte';
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
    onSetMode?: (mode: 'heat' | 'cool' | 'heat_cool' | 'off') => void;
  } = $props();

  // ── Display helpers ────────────────────────────────────────────────────────

  type ModeConfig = { label: string; color: string };
  const MODE: Record<string, ModeConfig> = {
    cool:      { label: 'Cooling', color: 'var(--color-accent-info)'    },
    heat:      { label: 'Heating', color: 'var(--color-accent-climate)' },
    heat_cool: { label: 'Auto',    color: 'var(--color-accent-music)'   },
    auto:      { label: 'Auto',    color: 'var(--color-accent-music)'   },
    off:       { label: 'Off',     color: 'var(--color-text-tertiary)'  },
  };

  let mode      = $derived(MODE[climate.state] ?? MODE['off']);
  let isOff     = $derived(climate.state === 'off');
  let isAuto    = $derived(climate.state === 'heat_cool' || climate.state === 'auto');
  let isActive  = $derived(!isOff && climate.attributes.hvac_action !== 'idle');
  let isHeating = $derived(climate.attributes.hvac_action === 'heating');
  let iconColor = $derived(isActive ? mode.color : 'var(--color-text-tertiary)');

  // Setpoint display — depends on mode
  let setpointDisplay = $derived(() => {
    if (isOff) return '--';
    if (isAuto) {
      const lo = climate.attributes.target_temp_low;
      const hi = climate.attributes.target_temp_high;
      return `${lo}–${hi}`;
    }
    // heat or cool: single temperature attribute
    const t = climate.attributes.temperature ?? climate.attributes.target_temp_high;
    return `${t}`;
  });

  // Whether setpoint is a range (auto) — controls font sizing
  let isRangeMode = $derived(isAuto && !isOff);
</script>

<div class="climate">
  <!-- Section label -->
  <div class="section-label">
    <Thermometer size={13} strokeWidth={2} />
    <span>Climate</span>
  </div>

  <div class="tiles">
    <!-- ── Left tile: display (35%) ── -->
    <div class="tile tile-display">
      <div class="temp-row">
        <span class="current-temp num">{climate.attributes.current_temperature}°</span>
        <span class="mode-icon" style:color={iconColor} style:opacity={isActive ? '0.9' : '0.4'}>
          {#if isHeating}
            <Thermometer size={30} strokeWidth={1.2} />
          {:else}
            <Wind size={30} strokeWidth={1.2} />
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
        <span class="set-label">Set</span>
        <span class="set-value num">
          {climate.attributes.target_temp_low}°–{climate.attributes.target_temp_high}°
        </span>
      </div>

      <div class="humidity">
        <span class="hum-icon"><Droplets size={14} strokeWidth={1.8} /></span>
        <span class="num">{humidity != null ? `${Math.round(humidity)}%` : '–'}</span>
        <span class="hum-label">RH</span>
      </div>
    </div>

    <!-- ── Right tile: controls (65%) ── -->
    <div class="tile tile-controls">

      <!-- Top row: [−] [setpoint] [+] -->
      <div class="setpoint-row">
        <button
          class="adj-btn"
          aria-label="Decrease setpoint"
          disabled={isOff}
          style:opacity={isOff ? '0.3' : '1'}
          onclick={() => onAdjustSetpoint?.(-1)}
        >
          <span class="adj-sign">−</span>
        </button>

        <span
          class="sp-value num"
          class:range={isRangeMode}
          class:dimmed={isOff}
        >
          {setpointDisplay()}
        </span>

        <button
          class="adj-btn"
          aria-label="Increase setpoint"
          disabled={isOff}
          style:opacity={isOff ? '0.3' : '1'}
          onclick={() => onAdjustSetpoint?.(1)}
        >
          <span class="adj-sign">+</span>
        </button>
      </div>

      <!-- Bottom row: Heat | Cool | Auto | Off -->
      <div class="mode-btns">
        <div class="mode-item">
          <button
            class="mode-btn"
            class:active={climate.state === 'heat'}
            aria-label="Heat mode"
            onclick={() => onSetMode?.('heat')}
          >
            <Flame size={22} strokeWidth={1.5} />
          </button>
          <span class="mode-lbl">Heat</span>
        </div>

        <div class="mode-item">
          <button
            class="mode-btn"
            class:active={climate.state === 'cool'}
            aria-label="Cool mode"
            onclick={() => onSetMode?.('cool')}
          >
            <Snowflake size={22} strokeWidth={1.5} />
          </button>
          <span class="mode-lbl">Cool</span>
        </div>

        <div class="mode-item">
          <button
            class="mode-btn"
            class:active={climate.state === 'heat_cool' || climate.state === 'auto'}
            aria-label="Auto mode"
            onclick={() => onSetMode?.('heat_cool')}
          >
            <RefreshCw size={22} strokeWidth={1.5} />
          </button>
          <span class="mode-lbl">Auto</span>
        </div>

        <div class="mode-item">
          <button
            class="mode-btn off-btn"
            class:active={climate.state === 'off'}
            aria-label="Turn off"
            onclick={() => onSetMode?.('off')}
          >
            <Power size={22} strokeWidth={1.5} />
          </button>
          <span class="mode-lbl">Off</span>
        </div>
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
    grid-template-columns: 35fr 65fr;
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
    gap: 0.4rem;
    padding: 0.8rem 1rem;
  }

  .temp-row {
    display: flex;
    align-items: center;
    gap: 0.2em;
    line-height: 1;
  }

  /* Current temp: slightly smaller in narrower tile */
  .current-temp {
    font-size: clamp(48px, 5.00vw, 72px);
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
    font-size: clamp(12px, 1.39vw, 18px);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .setpoint-range {
    display: flex;
    align-items: baseline;
    gap: 0.3em;
  }

  .set-label {
    font-size: clamp(12px, 1.25vw, 17px);
    color: var(--color-text-tertiary);
    font-weight: 500;
  }

  .set-value {
    font-size: clamp(13px, 1.39vw, 19px);
    font-weight: 300;
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
  }

  .humidity {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--color-text-secondary);
    font-size: clamp(12px, 1.25vw, 17px);
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
    gap: 0.6rem;
    padding: 0.7rem 1.2rem;
  }

  /* +/- row: horizontal */
  .setpoint-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
  }

  /*
   * Controls tile is 65% of content width (90vw after 5vw padding each side)
   * = ~58.5vw. We size buttons as % of that tile width using vw as the proxy:
   *
   *   +/− buttons:   ~12% of tile → 7vw   → clamp(64px, 7vw, 96px)
   *   Setpoint value: dominant     → 8.5vw → clamp(80px, 8.5vw, 120px)
   *   Mode buttons:  ~9% of tile  → 5.5vw → clamp(52px, 5.5vw, 80px)
   */

  /* − and + buttons */
  .adj-btn {
    width:  clamp(64px, 7vw, 96px);
    height: clamp(64px, 7vw, 96px);
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 200ms cubic-bezier(0.32, 0.72, 0, 1),
                transform  150ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .adj-btn:active:not(:disabled) {
    background: var(--color-surface-3);
    transform: scale(0.93);
  }

  .adj-btn:disabled { cursor: default; pointer-events: none; }

  .adj-sign {
    /* ~50% of button diameter */
    font-size: clamp(28px, 3vw, 42px);
    font-weight: 300;
    line-height: 1;
    color: var(--color-text-primary);
    user-select: none;
  }

  /* Setpoint value: dominant number between the two buttons */
  .sp-value {
    font-size: clamp(80px, 8.5vw, 120px);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
    line-height: 1;
    flex: 1;
    text-align: center;
    min-width: 0;
  }

  /* Auto range mode: smaller so "68–75" fits comfortably */
  .sp-value.range {
    font-size: clamp(48px, 5vw, 72px);
    font-weight: 300;
    letter-spacing: -0.02em;
  }

  .sp-value.dimmed { opacity: 0.35; }

  /* Mode buttons row */
  .mode-btns {
    display: flex;
    gap: clamp(10px, 1.5vw, 24px);
    justify-content: center;
  }

  .mode-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .mode-btn {
    width:  clamp(52px, 5.5vw, 80px);
    height: clamp(52px, 5.5vw, 80px);
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    transition: background 200ms cubic-bezier(0.32, 0.72, 0, 1),
                color     200ms cubic-bezier(0.32, 0.72, 0, 1),
                opacity   200ms cubic-bezier(0.32, 0.72, 0, 1),
                transform 150ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .mode-btn.active {
    background: color-mix(in srgb, var(--color-accent-climate) 18%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--color-accent-climate) 35%, transparent);
    color: var(--color-accent-climate);
    opacity: 1;
  }

  /* Off button active uses neutral, not climate accent */
  .mode-btn.off-btn.active {
    background: color-mix(in srgb, var(--color-accent-neutral) 18%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--color-accent-neutral) 35%, transparent);
    color: var(--color-accent-neutral);
  }

  .mode-btn:active { transform: scale(0.9); opacity: 1; }

  /* Scale icons inside mode buttons via CSS — overrides the size prop */
  .mode-btn :global(svg) {
    width:  clamp(22px, 2.4vw, 34px);
    height: clamp(22px, 2.4vw, 34px);
  }

  .mode-lbl {
    font-size: clamp(13px, 1.25vw, 18px);
    font-weight: 500;
    color: var(--color-text-tertiary);
    letter-spacing: 0.03em;
    user-select: none;
  }
</style>
