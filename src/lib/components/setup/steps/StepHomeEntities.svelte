<script lang="ts">
  import { haStore } from '$lib/stores/ha.svelte.js';

  interface Entities {
    weather: string; calendar: string; climate: string;
    tempSensor: string; humSensor: string;
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

  let weatherOpts  = $derived(Object.entries(haStore.entities).filter(([id]) => id.startsWith('weather.')).map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) })));
  let calendarOpts = $derived(Object.entries(haStore.entities).filter(([id]) => id.startsWith('calendar.')).map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) })));
  let climateOpts  = $derived(Object.entries(haStore.entities).filter(([id]) => id.startsWith('climate.')).map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) })));
  let tempOpts     = $derived(Object.entries(haStore.entities).filter(([id, e]) => id.startsWith('sensor.') && e.attributes?.device_class === 'temperature').map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) })));
  let humOpts      = $derived(Object.entries(haStore.entities).filter(([id, e]) => id.startsWith('sensor.') && e.attributes?.device_class === 'humidity').map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) })));

  $effect(() => {
    if (widgets.includes('weather')  && !value.weather    && weatherOpts.length  === 1) value.weather    = weatherOpts[0].id;
    if (widgets.includes('calendar') && !value.calendar   && calendarOpts.length === 1) value.calendar   = calendarOpts[0].id;
    if (widgets.includes('climate')  && !value.climate    && climateOpts.length  === 1) value.climate    = climateOpts[0].id;
    if (widgets.includes('climate')  && !value.tempSensor && tempOpts.length     === 1) value.tempSensor = tempOpts[0].id;
    if (widgets.includes('climate')  && !value.humSensor  && humOpts.length      === 1) value.humSensor  = humOpts[0].id;
  });

  let canContinue = $derived(
    (!widgets.includes('weather')  || value.weather)  &&
    (!widgets.includes('calendar') || value.calendar) &&
    (!widgets.includes('climate')  || value.climate)
  );
</script>

<div class="step">
  <div class="step-header">
    <h1>Connect your devices</h1>
    <p>Pick which Home Assistant entity to use for each widget.</p>
  </div>

  <div class="step-body">
    {#if !haStore.connected}
      <div class="connecting">
        <div class="spinner"></div>
        <p>Connecting to Home Assistant…</p>
      </div>
    {:else}
      <div class="content-list">

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
          <div class="picker-row sub">
            <label>Temperature sensor <span class="opt">(optional)</span></label>
            <select bind:value={value.tempSensor}>
              <option value="">— none —</option>
              {#each tempOpts as o}<option value={o.id}>{o.name}</option>{/each}
            </select>
          </div>
          <div class="picker-row sub">
            <label>Humidity sensor <span class="opt">(optional)</span></label>
            <select bind:value={value.humSensor}>
              <option value="">— none —</option>
              {#each humOpts as o}<option value={o.id}>{o.name}</option>{/each}
            </select>
          </div>
        {/if}

      </div>
    {/if}
  </div>

  <div class="step-footer">
    <button class="btn btn-back" onclick={onBack}>← Back</button>
    <button class="btn btn-continue" disabled={!canContinue || !haStore.connected} onclick={onContinue}>
      Continue →
    </button>
  </div>
</div>

<style>
  .step {
    height: 100%; display: flex; flex-direction: column;
    background: #000; color: #fff; isolation: isolate;
  }

  .step-header {
    flex-shrink: 0; padding: 44px 36px 20px; text-align: center;
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
    color: rgba(255,255,255,0.45); font-size: 20px;
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
    display: flex; flex-direction: column; gap: 22px;
    width: 100%; max-width: 760px;
  }

  .picker-row { display: flex; flex-direction: column; gap: 10px; }
  .picker-row.sub { margin-left: 28px; }

  label { font-size: 20px; font-weight: 500; color: rgba(255,255,255,0.75); }
  .opt  { font-weight: 400; color: rgba(255,255,255,0.35); font-size: 0.9em; }

  select {
    padding: 20px 16px;
    font-size: 20px;
    background: #111;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 16px; color: #fff; cursor: pointer; outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 16px center; padding-right: 48px;
    transition: border-color 150ms; min-height: 80px;
  }
  select:focus { border-color: rgba(255,255,255,0.4); }
  option { background: #111; }

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
  .btn-continue:disabled { opacity: 0.25; cursor: not-allowed; }
  .btn-continue:not(:disabled):active { transform: scale(0.98); }
</style>
