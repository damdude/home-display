<script lang="ts">
  import { Camera, Shield } from 'lucide-svelte';
  import { haStore } from '$lib/stores/ha.svelte.js';

  interface Props {
    cameras: string[];
    alarm:   string;
    onBack:     () => void;
    onContinue: () => void;
  }
  let {
    cameras = $bindable([]),
    alarm   = $bindable(''),
    onBack, onContinue,
  }: Props = $props();

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

  // Auto-select single alarm
  $effect(() => {
    if (!alarm && alarmOpts.length === 1) alarm = alarmOpts[0].id;
  });

  function toggleCamera(id: string) {
    if (cameras.includes(id)) cameras = cameras.filter(c => c !== id);
    else cameras = [...cameras, id];
  }
</script>

<div class="step">
  <div class="header">
    <h1>Security tab setup</h1>
    <p>Choose your cameras and alarm system.</p>
  </div>

  {#if !haStore.connected}
    <div class="connecting">
      <div class="spinner"></div>
      <p>Connecting to Home Assistant…</p>
    </div>
  {:else}

    <div class="sections">

      <!-- Cameras -->
      <div class="section">
        <div class="section-header">
          <Camera size={18} strokeWidth={1.8} />
          <span>Cameras <span class="count">({cameraOpts.length} found)</span></span>
        </div>
        {#if cameraOpts.length === 0}
          <p class="empty">No camera entities found in Home Assistant.</p>
        {:else}
          <div class="check-list">
            {#each cameraOpts as cam}
              {@const on = cameras.includes(cam.id)}
              <button class="check-row" class:on onclick={() => toggleCamera(cam.id)}>
                <span class="checkbox" class:on>{on ? '✓' : ''}</span>
                <span>{cam.name}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Alarm -->
      <div class="section">
        <div class="section-header">
          <Shield size={18} strokeWidth={1.8} />
          <span>Alarm panel <span class="opt">(optional)</span></span>
        </div>
        <select bind:value={alarm}>
          <option value="">— none —</option>
          {#each alarmOpts as a}<option value={a.id}>{a.name}</option>{/each}
        </select>
      </div>

    </div>

  {/if}

  <div class="footer">
    <button class="btn-ghost" onclick={onBack}>← Back</button>
    <button class="btn-primary" onclick={onContinue}>Continue →</button>
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

  .connecting { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--color-text-secondary); font-size: clamp(15px, 1.6vw, 20px); }
  .spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--color-accent-music); animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sections { display: flex; flex-direction: column; gap: 24px; flex: 1; max-width: 560px; justify-content: center; }

  .section { display: flex; flex-direction: column; gap: 10px; }
  .section-header { display: flex; align-items: center; gap: 8px; font-size: clamp(14px, 1.4vw, 18px); font-weight: 600; color: var(--color-text-primary); }
  .count { font-weight: 400; color: var(--color-text-tertiary); font-size: 0.9em; }
  .opt   { font-weight: 400; color: var(--color-text-tertiary); font-size: 0.9em; }
  .empty { font-size: clamp(13px, 1.2vw, 16px); color: var(--color-text-tertiary); font-style: italic; margin: 0; }

  .check-list { display: flex; flex-direction: column; gap: 8px; }
  .check-row {
    display: flex; align-items: center; gap: 12px;
    padding: clamp(10px, 1.4vh, 16px) 14px;
    border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.07);
    background: var(--color-surface-1); cursor: pointer; text-align: left; width: 100%;
    font-size: clamp(14px, 1.4vw, 18px); color: var(--color-text-primary);
    transition: border-color 150ms, background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .check-row.on { border-color: color-mix(in srgb, var(--color-accent-music) 50%, transparent); background: color-mix(in srgb, var(--color-accent-music) 8%, var(--color-surface-1)); }
  .checkbox {
    width: 22px; height: 22px; border-radius: 6px;
    border: 2px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: transparent; flex-shrink: 0;
    transition: all 150ms;
  }
  .checkbox.on { background: var(--color-accent-music); border-color: var(--color-accent-music); color: #fff; }

  select {
    padding: clamp(10px, 1.4vh, 16px) 14px;
    font-size: clamp(14px, 1.4vw, 18px);
    background: var(--color-surface-2); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px; color: var(--color-text-primary); cursor: pointer; outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px;
  }

  .footer { display: flex; gap: 12px; margin-top: auto; }
  .btn-primary { flex: 2; padding: clamp(14px, 2vh, 20px); background: var(--color-accent-music); color: #fff; border: none; border-radius: 12px; font-size: clamp(16px, 1.7vw, 22px); font-weight: 600; cursor: pointer; transition: opacity 150ms, transform 100ms; -webkit-tap-highlight-color: transparent; }
  .btn-primary:not(:disabled):active { transform: scale(0.97); }
  .btn-ghost { flex: 1; padding: clamp(14px, 2vh, 20px); background: rgba(255,255,255,0.07); color: var(--color-text-secondary); border: none; border-radius: 12px; font-size: clamp(16px, 1.7vw, 22px); font-weight: 500; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 150ms; }
  .btn-ghost:active { background: rgba(255,255,255,0.12); }
</style>
