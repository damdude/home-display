<script lang="ts">
  import { haStore } from '$lib/stores/ha.svelte.js';

  interface Entities {
    weather:    string;
    calendar:   string;
    climate:    string;
    tempSensor: string;
    humSensor:  string;
  }

  interface Props {
    widgets:    string[];
    value:      Entities;
    onBack:     () => void;
    onContinue: () => void;
  }
  let { widgets, value = $bindable({
    weather: '', calendar: '', climate: '', tempSensor: '', humSensor: '',
  } as Entities), onBack, onContinue }: Props = $props();

  // Derive entity lists from live haStore
  let weatherOpts = $derived(
    Object.entries(haStore.entities)
      .filter(([id]) => id.startsWith('weather.'))
      .map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) }))
  );
  let calendarOpts = $derived(
    Object.entries(haStore.entities)
      .filter(([id]) => id.startsWith('calendar.'))
      .map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) }))
  );
  let climateOpts = $derived(
    Object.entries(haStore.entities)
      .filter(([id]) => id.startsWith('climate.'))
      .map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) }))
  );
  let tempOpts = $derived(
    Object.entries(haStore.entities)
      .filter(([id, e]) => id.startsWith('sensor.') && e.attributes?.device_class === 'temperature')
      .map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) }))
  );
  let humOpts = $derived(
    Object.entries(haStore.entities)
      .filter(([id, e]) => id.startsWith('sensor.') && e.attributes?.device_class === 'humidity')
      .map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) }))
  );

  // Auto-select when only one option
  $effect(() => {
    if (widgets.includes('weather')  && !value.weather    && weatherOpts.length  === 1) value.weather    = weatherOpts[0].id;
    if (widgets.includes('calendar') && !value.calendar   && calendarOpts.length === 1) value.calendar   = calendarOpts[0].id;
    if (widgets.includes('climate')  && !value.climate    && climateOpts.length  === 1) value.climate    = climateOpts[0].id;
    if (widgets.includes('climate')  && !value.tempSensor && tempOpts.length     === 1) value.tempSensor = tempOpts[0].id;
    if (widgets.includes('climate')  && !value.humSensor  && humOpts.length      === 1) value.humSensor  = humOpts[0].id;
  });

  let canContinue = $derived(
    (!widgets.includes('weather')  || value.weather)    &&
    (!widgets.includes('calendar') || value.calendar)   &&
    (!widgets.includes('climate')  || value.climate)
  );
</script>

<div class="step">
  <div class="header">
    <h1>Connect your devices</h1>
    <p>Pick which Home Assistant entity to use for each widget.</p>
  </div>

  {#if !haStore.connected}
    <div class="connecting">
      <div class="spinner"></div>
      <p>Connecting to Home Assistant…</p>
    </div>
  {:else}

    <div class="pickers">

      {#if widgets.includes('weather')}
        <div class="picker-row">
          <label>Weather entity</label>
          <select bind:value={value.weather}>
            <option value="">— pick one —</option>
            {#each weatherOpts as o}<option value={o.id}>{o.name}</option>{/each}
          </select>
        </div>
      {/if}

      {#if widgets.includes('calendar')}
        <div class="picker-row">
          <label>Calendar entity</label>
          <select bind:value={value.calendar}>
            <option value="">— pick one —</option>
            {#each calendarOpts as o}<option value={o.id}>{o.name}</option>{/each}
          </select>
        </div>
      {/if}

      {#if widgets.includes('climate')}
        <div class="picker-row">
          <label>Thermostat</label>
          <select bind:value={value.climate}>
            <option value="">— pick one —</option>
            {#each climateOpts as o}<option value={o.id}>{o.name}</option>{/each}
          </select>
        </div>
        <div class="picker-row secondary">
          <label>Temperature sensor <span class="opt">(optional)</span></label>
          <select bind:value={value.tempSensor}>
            <option value="">— none —</option>
            {#each tempOpts as o}<option value={o.id}>{o.name}</option>{/each}
          </select>
        </div>
        <div class="picker-row secondary">
          <label>Humidity sensor <span class="opt">(optional)</span></label>
          <select bind:value={value.humSensor}>
            <option value="">— none —</option>
            {#each humOpts as o}<option value={o.id}>{o.name}</option>{/each}
          </select>
        </div>
      {/if}

    </div>

  {/if}

  <div class="footer">
    <button class="btn-ghost" onclick={onBack}>← Back</button>
    <button class="btn-primary" disabled={!canContinue || !haStore.connected} onclick={onContinue}>
      Continue →
    </button>
  </div>
</div>

<style>
  .step {
    height: 100%; display: flex; flex-direction: column;
    padding: clamp(24px, 4vh, 48px) clamp(24px, 5vw, 60px);
    gap: clamp(20px, 3vh, 36px);
  }

  .header h1 { font-size: clamp(28px, 3.5vw, 48px); font-weight: 700; color: var(--color-text-primary); margin: 0 0 8px; }
  .header p  { font-size: clamp(14px, 1.5vw, 20px); color: var(--color-text-secondary); margin: 0; }

  .connecting {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 16px; color: var(--color-text-secondary);
    font-size: clamp(15px, 1.6vw, 20px);
  }
  .spinner {
    width: 44px; height: 44px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--color-accent-music);
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .pickers {
    display: flex; flex-direction: column; gap: 16px;
    flex: 1; max-width: 560px; justify-content: center;
  }

  .picker-row { display: flex; flex-direction: column; gap: 6px; }
  .picker-row.secondary { margin-left: 24px; }

  label {
    font-size: clamp(13px, 1.3vw, 17px); font-weight: 500;
    color: var(--color-text-primary);
  }
  .opt { font-weight: 400; color: var(--color-text-tertiary); font-size: 0.9em; }

  select {
    padding: clamp(10px, 1.4vh, 16px) 14px;
    font-size: clamp(14px, 1.4vw, 18px);
    background: var(--color-surface-2);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px; color: var(--color-text-primary);
    cursor: pointer; outline: none;
    transition: border-color 150ms;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 40px;
  }
  select:focus { border-color: var(--color-accent-music); }

  .footer { display: flex; gap: 12px; margin-top: auto; }

  .btn-primary {
    flex: 2; padding: clamp(14px, 2vh, 20px);
    background: var(--color-accent-music); color: #fff;
    border: none; border-radius: 12px;
    font-size: clamp(16px, 1.7vw, 22px); font-weight: 600;
    cursor: pointer; transition: opacity 150ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-primary:not(:disabled):active { transform: scale(0.97); }

  .btn-ghost {
    flex: 1; padding: clamp(14px, 2vh, 20px);
    background: rgba(255,255,255,0.07); color: var(--color-text-secondary);
    border: none; border-radius: 12px;
    font-size: clamp(16px, 1.7vw, 22px); font-weight: 500;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background 150ms;
  }
  .btn-ghost:active { background: rgba(255,255,255,0.12); }
</style>
