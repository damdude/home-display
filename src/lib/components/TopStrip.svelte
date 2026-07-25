<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Sun, Moon, Settings, Lock, Users } from 'lucide-svelte';
  import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
  import { lockState } from '$lib/stores/lockState.svelte.js';
  import { guestState } from '$lib/stores/guestState.svelte.js';

  // ── Props ────────────────────────────────────────────────────────────────────
  let {
    haConnected = true,
    locationLabel = '',
  }: {
    /** False while HA WebSocket is reconnecting. */
    haConnected?: boolean;
    /** Optional room/location prefix for the greeting, e.g. "Master Bathroom". */
    locationLabel?: string;
  } = $props();

  // ── Clock + greeting ──────────────────────────────────────────────────────────
  let timeStr  = $state('');
  let greeting = $state('');
  let interval: ReturnType<typeof setInterval>;

  function updateClock() {
    const now = new Date();
    const h   = now.getHours();
    const m   = now.getMinutes().toString().padStart(2, '0');
    const h12 = h % 12 || 12;
    timeStr = `${h12}:${m}`;
    const prefix = locationLabel ? locationLabel + ' · ' : '';
    if      (h < 12) greeting = prefix + 'Good morning';
    else if (h < 17) greeting = prefix + 'Good afternoon';
    else             greeting = prefix + 'Good evening';
  }

  onMount(() => {
    updateClock();
    interval = setInterval(updateClock, 1000);
  });
  onDestroy(() => clearInterval(interval));

  // ── Settings overlay ─────────────────────────────────────────────────────────
  let showSettings = $state(false);

  // ── Theme toggle ──────────────────────────────────────────────────────────────
  let theme = $state<'dark' | 'light'>('dark');

  onMount(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light') theme = 'light';
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('dashboard.theme', theme); } catch (_) {}
  }
</script>

<div class="strip">
  <!-- Left: clock + greeting -->
  <div class="left">
    <p class="clock num">{timeStr}</p>
    <p class="greeting">{greeting}</p>
  </div>

  <!-- Right: child-lock indicator + theme toggle + gear -->
  <div class="actions">
    {#if guestState.active}
      <div class="guest-indicator" aria-label="Guest mode on" title="Guest mode on">
        <Users size={24} strokeWidth={2} />
      </div>
    {/if}
    {#if lockState.locked}
      <div class="lock-indicator" aria-label="Child lock on" title="Child lock on">
        <Lock size={24} strokeWidth={2} />
      </div>
    {/if}

    <button
      class="theme-btn"
      onclick={toggleTheme}
      aria-label="Toggle theme"
    >
      {#if theme === 'dark'}
        <Moon size={26} strokeWidth={1.6} />
      {:else}
        <Sun size={26} strokeWidth={1.6} />
      {/if}
    </button>

    <button
      class="gear-btn"
      onclick={() => showSettings = true}
      aria-label="Settings"
    >
      <Settings size={26} strokeWidth={1.6} />
    </button>
  </div>
</div>

{#if showSettings}
  <SettingsOverlay onClose={() => showSettings = false} />
{/if}

<style>
  /* Clock + greeting centered; action buttons pinned to the right */
  .strip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    position: relative;
    padding-top: 0.1em;
  }

  /* ── Clock ── */
  .left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1em;
    line-height: 1;
    text-align: center;
  }

  .clock {
    font-size: var(--type-clock);
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1;
  }

  .greeting {
    font-size: clamp(20px, 2.4vw, 34px);
    font-weight: 400;
    color: var(--color-text-secondary);
    margin: 0;
    letter-spacing: 0.01em;
  }

  /* ── Right action cluster ── */
  .actions {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* ── Guest-mode indicator ── */
  .guest-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-accent-info) 18%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-accent-info) 40%, transparent);
    color: var(--color-accent-info);
    flex-shrink: 0;
  }

  /* ── Child-lock indicator ── */
  .lock-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-accent-alert) 18%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-accent-alert) 40%, transparent);
    color: var(--color-accent-alert);
    flex-shrink: 0;
  }

  /* ── Theme toggle ── */
  .theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 300ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .theme-btn:active {
    background: var(--color-surface-3);
    transform: scale(0.94);
  }

  /* ── Gear / Settings ── */
  .gear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 300ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }
  .gear-btn:active {
    background: var(--color-surface-3, rgba(255,255,255,0.12));
    transform: scale(0.94);
  }
</style>
