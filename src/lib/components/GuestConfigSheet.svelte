<script lang="ts">
  /**
   * Guest-mode configuration sheet. The owner picks, per tab, what stays visible
   * while guests are around, then enables guest mode. Home is always shown; its
   * individual widgets are toggleable, and each other configured tab can be
   * shown or hidden wholesale.
   */
  import { fly, fade } from 'svelte/transition';
  import { cubicOut }  from 'svelte/easing';
  import { goto }      from '$app/navigation';
  import { Check, Cloud, CalendarDays, Thermometer, Music2, Shield, LayoutGrid } from 'lucide-svelte';
  import { guestState }  from '$lib/stores/guestState.svelte.js';
  import { configStore } from '$lib/stores/configStore.svelte.js';

  interface Props { open: boolean; onClose: () => void; }
  let { open, onClose }: Props = $props();

  const HOME_WIDGETS = [
    { id: 'weather',     label: 'Weather',     Icon: Cloud },
    { id: 'calendar',    label: 'Calendar',    Icon: CalendarDays },
    { id: 'climate',     label: 'Climate',     Icon: Thermometer },
    { id: 'now_playing', label: 'Now Playing', Icon: Music2 },
  ] as const;

  const OTHER_TABS = [
    { id: 'security', label: 'Security', Icon: Shield },
    { id: 'music',    label: 'Music',    Icon: Music2 },
    { id: 'zones',    label: 'Zones',    Icon: LayoutGrid },
  ] as const;

  // Only offer tabs the user actually configured in the wizard.
  let otherTabs = $derived(OTHER_TABS.filter(t => (configStore.tabs as string[]).includes(t.id)));

  // Local selection — everything checked by default each time the sheet opens.
  let homeSel = $state<Set<string>>(new Set());
  let tabSel  = $state<Set<string>>(new Set());

  $effect(() => {
    if (open) {
      homeSel = new Set(HOME_WIDGETS.map(w => w.id));
      tabSel  = new Set(otherTabs.map(t => t.id));
    }
  });

  function toggleHome(id: string) {
    const next = new Set(homeSel);
    next.has(id) ? next.delete(id) : next.add(id);
    homeSel = next;
  }
  function toggleTab(id: string) {
    const next = new Set(tabSel);
    next.has(id) ? next.delete(id) : next.add(id);
    tabSel = next;
  }

  function enable() {
    guestState.enable([...tabSel], [...homeSel]);
    onClose();
    goto('/');   // land on Home so a now-hidden tab isn't left showing
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="gc-backdrop" transition:fade={{ duration: 200 }} onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="gc-panel" transition:fly={{ y: -800, duration: 360, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}>

      <div class="gc-grabber" onclick={onClose}><span></span></div>

      <h2 class="gc-title">Guest Mode</h2>
      <p class="gc-sub">Choose what stays visible while guests are over. Everything else is hidden until you exit guest mode.</p>

      <!-- Home widgets -->
      <div class="gc-section">
        <p class="gc-section-label">Home widgets</p>
        <div class="gc-list">
          {#each HOME_WIDGETS as { id, label, Icon } (id)}
            <button class="gc-row" class:on={homeSel.has(id)} onclick={() => toggleHome(id)}>
              <span class="gc-row-icon"><Icon size={26} strokeWidth={1.6} /></span>
              <span class="gc-row-label">{label}</span>
              <span class="gc-check">{#if homeSel.has(id)}<Check size={22} strokeWidth={2.4} />{/if}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Other tabs -->
      {#if otherTabs.length > 0}
        <div class="gc-section">
          <p class="gc-section-label">Tabs</p>
          <div class="gc-list">
            {#each otherTabs as { id, label, Icon } (id)}
              <button class="gc-row" class:on={tabSel.has(id)} onclick={() => toggleTab(id)}>
                <span class="gc-row-icon"><Icon size={26} strokeWidth={1.6} /></span>
                <span class="gc-row-label">{label}</span>
                <span class="gc-check">{#if tabSel.has(id)}<Check size={22} strokeWidth={2.4} />{/if}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <button class="gc-enable" onclick={enable}>Enable Guest Mode</button>
    </div>
  </div>
{/if}

<style>
  .gc-backdrop { position: fixed; inset: 0; z-index: 450; background: rgba(0,0,0,0.5); }
  .gc-panel {
    position: absolute; top: 0; left: 0; right: 0;
    max-height: 92vh; overflow-y: auto; scrollbar-width: none;
    background: var(--color-surface-1);
    border-bottom-left-radius: 28px; border-bottom-right-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    display: flex; flex-direction: column; gap: 16px;
    padding: 12px 28px 32px;
  }
  .gc-panel::-webkit-scrollbar { display: none; }
  .gc-grabber { display: flex; justify-content: center; padding: 4px 0 0; cursor: pointer; }
  .gc-grabber span { width: 48px; height: 5px; border-radius: 3px; background: var(--color-text-tertiary); opacity: 0.5; }
  .gc-title { font-size: 30px; font-weight: 700; margin: 0; color: var(--color-text-primary); }
  .gc-sub { font-size: 16px; color: var(--color-text-tertiary); margin: -6px 0 0; line-height: 1.4; }

  .gc-section { display: flex; flex-direction: column; gap: 8px; }
  .gc-section-label {
    font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--color-text-tertiary); margin: 4px 0 0;
  }
  .gc-list { display: flex; flex-direction: column; gap: 10px; }

  .gc-row {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px; border-radius: 16px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    cursor: pointer; text-align: left;
    -webkit-tap-highlight-color: transparent;
    transition: background 150ms, color 150ms, border-color 150ms;
  }
  .gc-row.on {
    color: var(--color-text-primary);
    border-color: color-mix(in srgb, var(--color-accent-info) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent-info) 10%, var(--color-surface-2));
  }
  .gc-row-icon  { display: flex; flex-shrink: 0; }
  .gc-row-label { flex: 1; font-size: 20px; font-weight: 500; }
  .gc-check {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; flex-shrink: 0;
    color: var(--color-accent-info);
  }

  .gc-enable {
    margin-top: 6px;
    padding: 22px; border-radius: 18px; border: none;
    background: var(--color-accent-info); color: #fff;
    font-size: 21px; font-weight: 700; cursor: pointer;
    min-height: 72px;
    -webkit-tap-highlight-color: transparent;
  }
  .gc-enable:active { opacity: 0.9; }
</style>
