<script lang="ts">
  import { fly, fade }  from 'svelte/transition';
  import { cubicOut }   from 'svelte/easing';
  import { AlertTriangle, XCircle, Cpu, Trash2, Check } from 'lucide-svelte';
  import { notificationStore } from '$lib/stores/notificationStore.svelte.js';

  interface Props { open: boolean; onClose: () => void; }
  let { open, onClose }: Props = $props();

  function fmtTime(ts: number): string {
    const d  = new Date(ts);
    const h  = d.getHours() % 12 || 12;
    const m  = d.getMinutes().toString().padStart(2, '0');
    const ap = d.getHours() < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ap}`;
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nc-backdrop" transition:fade={{ duration: 200 }} onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="nc-panel"
      transition:fly={{ y: 700, duration: 360, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="nc-grabber" onclick={onClose}><span></span></div>

      <div class="nc-header">
        <h2>Notifications</h2>
        <div class="nc-actions">
          <button class="nc-act" onclick={() => notificationStore.markAllRead()} aria-label="Mark all read">
            <Check size={20} strokeWidth={2} />
          </button>
          <button class="nc-act" onclick={() => notificationStore.clearAll()} aria-label="Clear all">
            <Trash2 size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div class="nc-scroll">
        {#if notificationStore.notifications.length === 0}
          <p class="nc-empty">No notifications</p>
        {:else}
          {#each notificationStore.notifications as n (n.id)}
            <div class="nc-item" class:unread={!n.read}>
              <span class="nc-icon nc-{n.kind}">
                {#if n.kind === 'device'}
                  <Cpu size={22} strokeWidth={1.8} />
                {:else if n.kind === 'warning'}
                  <AlertTriangle size={22} strokeWidth={1.8} />
                {:else}
                  <XCircle size={22} strokeWidth={1.8} />
                {/if}
              </span>
              <div class="nc-text">
                <span class="nc-title">{n.title}</span>
                {#if n.detail}<span class="nc-detail">{n.detail}</span>{/if}
              </div>
              <span class="nc-time">{fmtTime(n.ts)}</span>
            </div>
          {/each}
        {/if}

        {#if notificationStore.log.length > 0}
          <div class="nc-section-label">Activity Log</div>
          {#each notificationStore.log as l (l.id)}
            <div class="nc-log-row">
              <span class="nc-log-text">{l.text}</span>
              <span class="nc-log-time">{fmtTime(l.ts)}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .nc-backdrop {
    position: fixed; inset: 0; z-index: 400;
    background: rgba(0,0,0,0.5);
  }

  .nc-panel {
    position: absolute; bottom: 0; left: 0; right: 0;
    max-height: 88vh;
    background: var(--color-surface-1);
    border-top-left-radius: 28px; border-top-right-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: 0 -20px 60px rgba(0,0,0,0.6);
    display: flex; flex-direction: column;
    padding: 12px 28px 28px;
  }

  .nc-header {
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; margin-bottom: 16px;
  }
  .nc-header h2 { font-size: 30px; font-weight: 700; margin: 0; color: var(--color-text-primary); }
  .nc-actions { display: flex; gap: 10px; }
  .nc-act {
    width: 48px; height: 48px; border-radius: 50%;
    border: none; background: var(--color-surface-2);
    color: var(--color-text-secondary); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .nc-act:active { background: rgba(255,255,255,0.12); }

  .nc-scroll {
    flex: 1; min-height: 0; overflow-y: auto;
    display: flex; flex-direction: column; gap: 10px;
    scrollbar-width: none;
  }
  .nc-scroll::-webkit-scrollbar { display: none; }

  .nc-empty {
    color: var(--color-text-tertiary); font-size: 18px;
    text-align: center; padding: 40px 0; margin: 0;
  }

  .nc-item {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 16px;
  }
  .nc-item.unread {
    border-color: color-mix(in srgb, var(--color-accent-info, #6b9bd6) 45%, transparent);
  }
  .nc-icon { flex-shrink: 0; display: flex; align-items: center; }
  .nc-icon.nc-device  { color: var(--color-accent-safe); }
  .nc-icon.nc-warning { color: var(--color-accent-alert); }
  .nc-icon.nc-error   { color: var(--color-accent-triggered); }

  .nc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .nc-title  { font-size: 19px; font-weight: 600; color: var(--color-text-primary); }
  .nc-detail {
    font-size: 15px; color: var(--color-text-secondary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .nc-time { font-size: 14px; color: var(--color-text-tertiary); flex-shrink: 0; }

  .nc-section-label {
    font-size: 14px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--color-text-tertiary);
    margin: 18px 0 4px;
  }
  .nc-log-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; gap: 12px;
    border-bottom: 1px solid var(--color-border);
  }
  .nc-log-text { font-size: 15px; color: var(--color-text-secondary); flex: 1; min-width: 0; }
  .nc-log-time { font-size: 13px; color: var(--color-text-tertiary); flex-shrink: 0; }

  .nc-grabber {
    flex-shrink: 0; display: flex; justify-content: center;
    padding: 4px 0 12px; cursor: pointer;
  }
  .nc-grabber span {
    width: 48px; height: 5px; border-radius: 3px;
    background: var(--color-text-tertiary); opacity: 0.5;
  }
</style>
