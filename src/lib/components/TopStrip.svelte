<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Sun, Moon, Bell } from 'lucide-svelte';

  // ── Props ────────────────────────────────────────────────────────────────────
  let {
    haConnected = true,
    hasNotification = false,
  }: {
    /** False while HA WebSocket is reconnecting; shows indicator on bell. */
    haConnected?: boolean;
    /** True to show an accent dot on the bell icon (Phase 7+). */
    hasNotification?: boolean;
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
    if      (h < 12) greeting = 'Good morning, Rahul';
    else if (h < 17) greeting = 'Good afternoon, Rahul';
    else             greeting = 'Good evening, Rahul';
  }

  onMount(() => {
    updateClock();
    interval = setInterval(updateClock, 1000);
  });
  onDestroy(() => clearInterval(interval));

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
    <!-- Bell: inert this phase; dot when hasNotification; pulse when reconnecting -->
    <div
      class="bell-wrap"
      class:reconnecting={!haConnected}
      aria-label={!haConnected ? 'Reconnecting to Home Assistant…' : 'Notifications'}
      title={!haConnected ? 'Reconnecting…' : undefined}
    >
      <Bell size={20} strokeWidth={1.6} />
      {#if hasNotification || !haConnected}
        <span
          class="bell-dot"
          class:reconnect-dot={!haConnected}
        ></span>
      {/if}
    </div>

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
  </div>
</div>

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
  .bell-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: var(--color-text-secondary);
    opacity: 0.55;
    /* Inert — no pointer interaction this phase */
    pointer-events: none;
    user-select: none;
  }

  /* Reconnecting: pulse the bell to signal connectivity issue */
  .bell-wrap.reconnecting {
    opacity: 1;
    animation: bellPulse 2s ease-in-out infinite;
    color: var(--color-accent-alert);
  }

  @keyframes bellPulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1.0; }
  }

  /* Dot indicator (notification or reconnecting) */
  .bell-dot {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-accent-info);
    border: 1.5px solid var(--color-canvas);
  }

  .bell-dot.reconnect-dot {
    background: var(--color-accent-alert);
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
</style>
