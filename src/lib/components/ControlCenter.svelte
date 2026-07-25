<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut }  from 'svelte/easing';
  import { Lightbulb, ShieldCheck, Moon, Siren, Tv2, Lock, Users } from 'lucide-svelte';
  import { callHaService, haStore } from '$lib/stores/ha.svelte.js';
  import { lockState }  from '$lib/stores/lockState.svelte.js';
  import { guestState } from '$lib/stores/guestState.svelte.js';

  interface Props {
    open: boolean;
    onClose: () => void;
    onOpenGuestConfig: () => void;
    onExitGuest: () => void;
  }
  let { open, onClose, onOpenGuestConfig, onExitGuest }: Props = $props();

  const ALARM_ID  = 'alarm_control_panel.security_partition_1';
  const LIGHTS_ID = 'switch.outdoor_lights_outlet1';

  let lightsOn = $derived(haStore.entities[LIGHTS_ID]?.state === 'on');

  function toggleLights() { callHaService('switch', 'toggle', { entity_id: LIGHTS_ID }); }
  function armAway()  { callHaService('alarm_control_panel', 'alarm_arm_away',  { entity_id: ALARM_ID }); }
  function armNight() { callHaService('alarm_control_panel', 'alarm_arm_night', { entity_id: ALARM_ID }); }
  function panic()    { callHaService('alarm_control_panel', 'alarm_trigger',   { entity_id: ALARM_ID }); }

  function engageChildLock() {
    lockState.lock();     // works with or without a PIN (unlock is gated only if a PIN is set)
    onClose();
  }

  function handleGuest() {
    if (guestState.active) onExitGuest();
    else onOpenGuestConfig();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="cc-backdrop" transition:fade={{ duration: 200 }} onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="cc-panel" transition:fly={{ y: -800, duration: 360, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}>

      <div class="cc-grabber" onclick={onClose}><span></span></div>

      <h2 class="cc-title">Control Center</h2>

      <!-- Quick Actions grid -->
      <div class="cc-grid">
        <button class="cc-action" class:on={lightsOn} onclick={toggleLights}>
          <span class="cc-icon"><Lightbulb size={38} strokeWidth={1.4} /></span>
          <span class="cc-label">Outdoor Lights</span>
        </button>
        <button class="cc-action">
          <span class="cc-icon"><Tv2 size={38} strokeWidth={1.4} /></span>
          <span class="cc-label">Living Room TV</span>
        </button>
        <button class="cc-action" onclick={armAway}>
          <span class="cc-icon"><ShieldCheck size={38} strokeWidth={1.4} /></span>
          <span class="cc-label">Arm Away</span>
        </button>
        <button class="cc-action" onclick={armNight}>
          <span class="cc-icon"><Moon size={38} strokeWidth={1.4} /></span>
          <span class="cc-label">Arm Night</span>
        </button>
        <button class="cc-action cc-panic" onclick={panic}>
          <span class="cc-icon"><Siren size={38} strokeWidth={1.4} /></span>
          <span class="cc-label">Panic</span>
        </button>
      </div>

      <!-- Child lock -->
      <button class="cc-mode" onclick={engageChildLock}>
        <Lock size={26} strokeWidth={1.8} />
        <span>Enable Child Lock</span>
      </button>

      <!-- Guest mode -->
      <button class="cc-mode" class:active={guestState.active} onclick={handleGuest}>
        <Users size={26} strokeWidth={1.8} />
        <span>{guestState.active ? 'Exit Guest Mode' : 'Enable Guest Mode'}</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .cc-backdrop { position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,0.5); }
  .cc-panel {
    position: absolute; top: 0; left: 0; right: 0;
    max-height: 92vh; overflow-y: auto; scrollbar-width: none;
    background: var(--color-surface-1);
    border-bottom-left-radius: 28px; border-bottom-right-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    display: flex; flex-direction: column; gap: 16px;
    padding: 12px 28px 32px;
  }
  .cc-panel::-webkit-scrollbar { display: none; }
  .cc-grabber { display: flex; justify-content: center; padding: 4px 0 0; cursor: pointer; }
  .cc-grabber span { width: 48px; height: 5px; border-radius: 3px; background: var(--color-text-tertiary); opacity: 0.5; }
  .cc-title { font-size: 30px; font-weight: 700; margin: 0; color: var(--color-text-primary); }

  .cc-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  }
  .cc-action {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 22px 16px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 20px; cursor: pointer;
    color: var(--color-text-secondary);
    min-height: 112px;
    -webkit-tap-highlight-color: transparent;
    transition: background 150ms, color 150ms, border-color 150ms;
  }
  .cc-action:active { transform: scale(0.98); }
  .cc-action.on {
    color: var(--color-accent-light);
    border-color: color-mix(in srgb, var(--color-accent-light) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent-light) 12%, var(--color-surface-2));
  }
  .cc-icon { display: flex; }
  .cc-label { font-size: 18px; font-weight: 500; }

  /* Panic — spans both columns, danger-styled */
  .cc-panic {
    grid-column: 1 / -1;
    flex-direction: row; gap: 14px; min-height: 84px;
    color: var(--color-accent-triggered);
    border-color: color-mix(in srgb, var(--color-accent-triggered) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent-triggered) 12%, var(--color-surface-2));
  }
  .cc-panic .cc-label { font-size: 21px; font-weight: 700; }

  .cc-mode {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 20px; border-radius: 18px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-size: 20px; font-weight: 600; cursor: pointer;
    min-height: 68px;
    -webkit-tap-highlight-color: transparent;
  }
  .cc-mode:active { background: var(--color-surface-1); }
  .cc-mode.active {
    color: var(--color-accent-info);
    border-color: color-mix(in srgb, var(--color-accent-info) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent-info) 12%, var(--color-surface-2));
  }
</style>
