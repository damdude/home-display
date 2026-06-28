<script lang="ts">
  import { Camera, Shield } from 'lucide-svelte';
  import { haStore } from '$lib/stores/ha.svelte.js';

  interface Props {
    cameras:    string[];
    alarm:      string;
    onBack:     () => void;
    onContinue: () => void;
  }
  let { cameras = $bindable([]), alarm = $bindable(''), onBack, onContinue }: Props = $props();

  let cameraOpts = $derived(
    Object.entries(haStore.entities)
      .filter(([id]) => id.startsWith('camera.'))
      .map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) }))
  );
  let alarmOpts = $derived(
    Object.entries(haStore.entities)
      .filter(([id]) => id.startsWith('alarm_control_panel.'))
      .map(([id, e]) => ({ id, name: String(e.attributes?.friendly_name ?? id) }))
  );

  $effect(() => {
    if (!alarm && alarmOpts.length === 1) alarm = alarmOpts[0].id;
  });

  function toggleCamera(id: string) {
    if (cameras.includes(id)) cameras = cameras.filter(c => c !== id);
    else cameras = [...cameras, id];
  }
</script>

<div class="step">
  <div class="step-header">
    <h1>Security tab setup</h1>
    <p>Choose your cameras and alarm system.</p>
  </div>

  <div class="step-body">
    {#if !haStore.connected}
      <div class="connecting">
        <div class="spinner"></div>
        <p>Connecting to Home Assistant…</p>
      </div>
    {:else}
      <div class="content-list">

        <!-- Cameras -->
        <div class="section">
          <div class="section-label">
            <Camera size={16} strokeWidth={1.8} />
            <span>Cameras</span>
            <span class="count">({cameraOpts.length} found)</span>
          </div>
          {#if cameraOpts.length === 0}
            <p class="empty">No camera entities found in Home Assistant.</p>
          {:else}
            <div class="check-list">
              {#each cameraOpts as cam}
                {@const on = cameras.includes(cam.id)}
                <button class="option-row" class:selected={on} onclick={() => toggleCamera(cam.id)}>
                  <span class="check" class:on>{on ? '✓' : ''}</span>
                  <span class="row-label">{cam.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Alarm -->
        <div class="section">
          <div class="section-label">
            <Shield size={16} strokeWidth={1.8} />
            <span>Alarm panel</span>
            <span class="count">(optional)</span>
          </div>
          <select bind:value={alarm}>
            <option value="">— none —</option>
            {#each alarmOpts as a}<option value={a.id}>{a.name}</option>{/each}
          </select>
        </div>

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
    display: flex; flex-direction: column; gap: 32px;
    width: 100%; max-width: 760px;
  }

  .section { display: flex; flex-direction: column; gap: 12px; }

  .section-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 20px; font-weight: 600; color: rgba(255,255,255,0.65);
  }
  .count { font-weight: 400; color: rgba(255,255,255,0.3); font-size: 0.88em; }
  .empty { font-size: 17px; color: rgba(255,255,255,0.3); font-style: italic; margin: 0; }

  .check-list { display: flex; flex-direction: column; gap: 12px; }

  .option-row {
    display: flex; align-items: center; gap: 16px;
    padding: 24px 28px;
    background: #111;
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    cursor: pointer; text-align: left; width: 100%;
    transition: border-color 150ms, background 150ms;
    -webkit-tap-highlight-color: transparent;
    min-height: 92px;
  }
  .option-row.selected {
    border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.09);
  }
  .option-row:active { transform: scale(0.99); }

  .check {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    border: 1.5px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700; color: transparent; transition: all 150ms;
  }
  .check.on { background: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.9); color: #000; }

  .row-label {
    font-size: 28px; font-weight: 500;
    color: rgba(255,255,255,0.45); transition: color 150ms;
  }
  .option-row.selected .row-label { color: #fff; }

  select {
    padding: 20px 16px; font-size: 20px;
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
  .btn-continue:active { transform: scale(0.98); }
</style>
