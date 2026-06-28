<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Sun, Moon, Bell, Settings } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { zonesStore } from '$lib/stores/zonesStore.svelte.js';
  import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';

  // ── Props ────────────────────────────────────────────────────────────────────
  let {
    haConnected = true,
    hasNotification = false,
    locationLabel = '',
  }: {
    /** False while HA WebSocket is reconnecting; shows indicator on bell. */
    haConnected?: boolean;
    /** True to show an accent dot on the bell icon (Phase 7+). */
    hasNotification?: boolean;
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

  // ── Notification badge ────────────────────────────────────────────────────────
  let unassignedCount = $derived(
    zonesStore.unassigned?.entities.length ?? 0
  );

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

  <!-- Right: bell + theme toggle -->
  <div class="actions">
    <!-- Bell: navigates to /zones?section=unassigned when unassigned devices exist -->
    <button
      class="bell-btn"
      class:reconnecting={!haConnected}
      class:has-badge={unassignedCount > 0}
      aria-label={!haConnected ? 'Reconnecting to Home Assistant…' : (unassignedCount > 0 ? `${unassignedCount} unassigned device${unassignedCount !== 1 ? 's' : ''}` : 'Notifications')}
      onclick={() => {
        if (unassignedCount > 0) void goto('/zones?section=unassigned');
      }}
    >
      <Bell size={20} strokeWidth={1.6} />
      {#if !haConnected}
        <span class="bell-dot reconnect-dot"></span>
      {:else if unassignedCount > 0}
        <span class="badge">{unassignedCount > 9 ? '9+' : unassignedCount}</span>
      {:else if hasNotification}
        <span class="bell-dot"></span>
      {/if}
    </button>

    <button
      class="theme-btn"
      onclick={toggleTheme}
      aria-label="Toggle theme"
    >
      {#if theme === 'dark'}
        <Moon size={20} strokeWidth={1.6} />
      {:else}
        <Sun size={20} strokeWidth={1.6} />
      {/if}
    </button>

    <button
      class="gear-btn"
      onclick={() => showSettings = true}
      aria-label="Settings"
    >
      <Settings size={20} strokeWidth={1.6} />
    </button>
  </div>
</div>

{#if showSettings}
  <SettingsOverlay onClose={() => showSettings = false} />
{/if}

<style>
  .strip {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    padding-top: 0.1em;
  }

  /* ── Clock ── */
  .left {
    display: flex;
    flex-direction: column;
    gap: 0.12em;
    line-height: 1;
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
    font-size: clamp(16px, 1.94vw, 28px);
    font-weight: 400;
    color: var(--color-text-secondary);
    margin: 0;
    letter-spacing: 0.01em;
  }

  /* ── Right action cluster ── */
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /* ── Bell ── */
  .bell-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: none;
    color: var(--color-text-secondary);
    opacity: 0.55;
    cursor: default;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 150ms;
  }

  /* Active / has unassigned — make it tappable and visible */
  .bell-btn.has-badge {
    opacity: 1;
    cursor: pointer;
  }
  .bell-btn.has-badge:active { opacity: 0.75; }

  /* Reconnecting: pulse the bell to signal connectivity issue */
  .bell-btn.reconnecting {
    opacity: 1;
    cursor: default;
    animation: bellPulse 2s ease-in-out infinite;
    color: var(--color-accent-alert);
  }

  @keyframes bellPulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1.0; }
  }

  /* Small dot for generic notification / reconnecting */
  .bell-dot {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-accent-info);
    border: 1.5px solid var(--color-canvas);
    pointer-events: none;
  }

  .bell-dot.reconnect-dot {
    background: var(--color-accent-alert);
  }

  /* Numbered badge for unassigned devices */
  .badge {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    border-radius: 999px;
    background: #C66B6B;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    pointer-events: none;
    border: 1.5px solid var(--color-canvas);
  }

  /* ── Theme toggle ── */
  .theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
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
    width: 36px;
    height: 36px;
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
