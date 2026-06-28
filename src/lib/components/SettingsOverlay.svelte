<script lang="ts">
  import { RefreshCw, Power, Trash2, X } from 'lucide-svelte';

  interface Props {
    onClose: () => void;
  }
  let { onClose }: Props = $props();

  type ActionState = 'idle' | 'busy' | 'done' | 'error';
  let refreshState = $state<ActionState>('idle');
  let rebootState  = $state<ActionState>('idle');
  let resetState   = $state<ActionState>('idle');
  let confirmReset = $state(false);

  async function doRefresh() {
    refreshState = 'busy';
    try {
      await fetch('/api/settings/refresh', { method: 'POST' });
      refreshState = 'done';
      setTimeout(() => { refreshState = 'idle'; }, 2500);
    } catch {
      refreshState = 'error';
      setTimeout(() => { refreshState = 'idle'; }, 2500);
    }
  }

  async function doReboot() {
    rebootState = 'busy';
    try {
      await fetch('/api/settings/reboot', { method: 'POST' });
      // stays busy — Pi is rebooting
    } catch {
      rebootState = 'error';
      setTimeout(() => { rebootState = 'idle'; }, 2500);
    }
  }

  async function doReset() {
    if (!confirmReset) {
      confirmReset = true;
      setTimeout(() => { confirmReset = false; }, 4000);
      return;
    }
    resetState = 'busy';
    try {
      await fetch('/api/settings/reset', { method: 'POST' });
      // stays busy — Pi is rebooting
    } catch {
      resetState = 'error';
      confirmReset = false;
      setTimeout(() => { resetState = 'idle'; }, 2500);
    }
  }

  function btnLabel(
    state: ActionState,
    idle: string,
    busy: string,
    done: string
  ): string {
    if (state === 'busy')  return busy;
    if (state === 'done')  return done;
    if (state === 'error') return 'Error — try again';
    return idle;
  }

  const anyBusy = $derived(
    refreshState === 'busy' || rebootState === 'busy' || resetState === 'busy'
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose}>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="panel" onclick={(e) => e.stopPropagation()}>

    <div class="panel-header">
      <span class="panel-title">Settings</span>
      <button class="close-btn" onclick={onClose} aria-label="Close settings">
        <X size={20} strokeWidth={1.8} />
      </button>
    </div>

    <div class="action-list">

      <!-- Refresh -->
      <button
        class="action-row"
        class:is-busy={refreshState === 'busy'}
        class:is-done={refreshState === 'done'}
        disabled={anyBusy}
        onclick={doRefresh}
      >
        <span class="row-icon">
          <RefreshCw size={22} strokeWidth={1.6} />
        </span>
        <div class="row-text">
          <span class="row-label">
            {btnLabel(refreshState, 'Refresh', 'Refreshing…', '✓ Refreshed')}
          </span>
          <span class="row-desc">
            Reconnect to Home Assistant and reload all entities
          </span>
        </div>
      </button>

      <!-- Reboot Pi -->
      <button
        class="action-row"
        class:is-busy={rebootState === 'busy'}
        disabled={anyBusy}
        onclick={doReboot}
      >
        <span class="row-icon">
          <Power size={22} strokeWidth={1.6} />
        </span>
        <div class="row-text">
          <span class="row-label">
            {btnLabel(rebootState, 'Reboot', 'Rebooting…', 'Rebooting…')}
          </span>
          <span class="row-desc">Restart the Raspberry Pi</span>
        </div>
      </button>

      <!-- Factory Reset -->
      <button
        class="action-row danger-row"
        class:is-busy={resetState === 'busy'}
        class:is-confirm={confirmReset}
        disabled={anyBusy}
        onclick={doReset}
      >
        <span class="row-icon danger-icon">
          <Trash2 size={22} strokeWidth={1.6} />
        </span>
        <div class="row-text">
          {#if confirmReset}
            <span class="row-label danger-label">Tap again to confirm reset</span>
            <span class="row-desc danger-desc">
              All settings will be erased and Pi will reboot
            </span>
          {:else}
            <span class="row-label danger-label">
              {btnLabel(resetState, 'Factory Reset', 'Resetting…', 'Resetting…')}
            </span>
            <span class="row-desc">Erase all settings and start fresh</span>
          {/if}
        </div>
      </button>

    </div>
  </div>
</div>

<style>
  /* ── Backdrop ── */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 800;
    background: rgba(0, 0, 0, 0.78);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Panel ── */
  .panel {
    background: #111;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    width: min(88vw, 480px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Header ── */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .panel-title {
    font-size: clamp(16px, 1.8vw, 20px);
    font-weight: 600;
    color: #fff;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: background 120ms;
    -webkit-tap-highlight-color: transparent;
  }
  .close-btn:active { background: rgba(255, 255, 255, 0.14); }

  /* ── Action list ── */
  .action-list {
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 8px;
  }

  /* ── Each row ── */
  .action-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: clamp(16px, 2.2vh, 22px) 20px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    color: #fff;
    cursor: pointer;
    text-align: left;
    transition: background 120ms, border-color 120ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
    min-height: clamp(68px, 8.5vh, 84px);
    width: 100%;
  }

  .action-row:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.09);
    transform: scale(0.99);
  }

  .action-row:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .action-row.is-busy { opacity: 0.6; }
  .action-row.is-done { border-color: rgba(255, 255, 255, 0.25); }

  /* ── Row icon ── */
  .row-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.65);
  }

  /* ── Row text ── */
  .row-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .row-label {
    font-size: clamp(15px, 1.7vw, 18px);
    font-weight: 600;
    color: #fff;
    line-height: 1.2;
  }

  .row-desc {
    font-size: clamp(12px, 1.3vw, 14px);
    color: rgba(255, 255, 255, 0.38);
    line-height: 1.3;
  }

  /* ── Danger (reset) row ── */
  .danger-row {
    border-color: rgba(220, 80, 80, 0.2);
  }

  .danger-row.is-confirm {
    background: rgba(200, 50, 50, 0.1);
    border-color: rgba(220, 80, 80, 0.45);
  }

  .danger-icon { color: rgba(255, 130, 130, 0.75); }

  .danger-label { color: rgba(255, 170, 170, 0.9); }

  .danger-desc { color: rgba(255, 130, 130, 0.55) !important; }
</style>
