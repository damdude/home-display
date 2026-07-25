<script lang="ts">
  import '../app.css';
  import { onMount }  from 'svelte';
  import { fade }     from 'svelte/transition';
  import { page }     from '$app/stores';
  import type { Snippet } from 'svelte';
  import TopStrip         from '$lib/components/TopStrip.svelte';
  import StatusPillRow    from '$lib/components/StatusPillRow.svelte';
  import BottomNav        from '$lib/components/BottomNav.svelte';
  import MusicScreensaver    from '$lib/components/music/MusicScreensaver.svelte';
  import NotificationCenter  from '$lib/components/NotificationCenter.svelte';
  import ControlCenter       from '$lib/components/ControlCenter.svelte';
  import ChildLockOverlay    from '$lib/components/ChildLockOverlay.svelte';
  import GuestConfigSheet    from '$lib/components/GuestConfigSheet.svelte';
  import PinPrompt           from '$lib/components/PinPrompt.svelte';
  import FpsOverlay          from '$lib/components/dev/FpsOverlay.svelte';
  import QrScreen            from '$lib/components/setup/QrScreen.svelte';
  import SetupWizard         from '$lib/components/setup/SetupWizard.svelte';
  import { lockState }       from '$lib/stores/lockState.svelte.js';
  import { guestState }      from '$lib/stores/guestState.svelte.js';
  import { startHaStream }       from '$lib/stores/ha.svelte.js';
  import { startZonesStream }    from '$lib/stores/zonesStore.svelte.js';
  import { haStore }             from '$lib/stores/ha.svelte.js';
  import { musicState }          from '$lib/stores/musicState.svelte.js';
  import { idleState, startIdleDetection } from '$lib/stores/idleDetection.svelte.js';
  import { configStore }         from '$lib/stores/configStore.svelte.js';
  import { dragScroll, EDGE_BAND_TOP, EDGE_BAND_BOTTOM } from '$lib/actions/dragScroll.js';
  import { notificationStore }   from '$lib/stores/notificationStore.svelte.js';

  import {
    alarmSecurityPartition1,
    binarySensorMainDoor,
    binarySensorSideDoor,
    binarySensorBackPerimeter,
    binarySensorFrontSidePerimeter,
    TRIGGERED_DEMO,
    type AlarmState,
    type BinarySensorState,
    type PillDescriptor,
    type PillIconId,
  } from '$lib/data/placeholder.js';

  let { children }: { children: Snippet } = $props();

  let configLoaded = $state(false);
  let _stopHa:    (() => void) | undefined;
  let _stopIdle:  (() => void) | undefined;
  let _stopZones: (() => void) | undefined;

  // Notification center + control center
  let notifOpen   = $state(false);
  let controlOpen = $state(false);

  // Guest mode UI
  let guestConfigOpen     = $state(false);
  let guestExitPromptOpen = $state(false);

  function openGuestConfig() { controlOpen = false; guestConfigOpen = true; }
  function exitGuest() {
    controlOpen = false;
    if (configStore.security?.childLockPin) guestExitPromptOpen = true;
    else guestState.disable();   // no PIN configured → exit directly
  }

  // Tabs shown in the bottom nav — filtered while guest mode hides some.
  let navTabs = $derived(
    guestState.active ? configStore.tabs.filter(t => guestState.tabVisible(t)) : configStore.tabs,
  );

  let haTokenSet  = $derived(configStore.haTokenSet());
  let isSetupDone = $derived(configStore.isSetupDone());

  // Start the screensaver idle timer once setup is complete. As an effect (not
  // just onMount) it also fires when the wizard finishes in this same session.
  $effect(() => {
    if (!isSetupDone) return;
    if (_stopIdle) return;
    _stopIdle = startIdleDetection();
  });
  
  // CRITICAL: Skip ALL kiosk logic if on /setup route
  let isSetupRoute = $derived($page.url.pathname === '/setup');

  let routePath = $derived($page.url.pathname);
  let isHome    = $derived(routePath === '/');
  let isMusic   = $derived(routePath === '/music');

  onMount(async () => {
    // Restore saved theme before anything renders
    try {
      const saved = localStorage.getItem('dashboard.theme');
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.dataset.theme = saved;
      }
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/config');
      if (res.ok) configStore.set(await res.json());
    } catch { /* server may be starting */ }

    configLoaded = true;

    // Load entity baseline before streams start so diff is ready
    await notificationStore.loadBaseline();

    if (configStore.haTokenSet()) {
      // Start HA + zones streams as soon as we have credentials (wizard needs entity data)
      _stopHa    = startHaStream();
      _stopZones = startZonesStream();
    }
    // NOTE: idle detection (screensaver) is started by the effect below, not
    // here — so it also kicks in right after the wizard completes in the same
    // session, instead of only after a reload.

    // Window-level edge gestures. passive: true — we only observe, never
    // preventDefault, so scrolling / dragScroll stay smooth.
    window.addEventListener('pointerdown',   onWinPointerDown, { passive: true });
    window.addEventListener('pointermove',   onWinPointerMove, { passive: true });
    window.addEventListener('pointerup',     onWinPointerUp,   { passive: true });
    window.addEventListener('pointercancel', onWinPointerUp,   { passive: true });

    // New-device detection. Entities do not gain new members several times per
    // second — polling every 60s is ample and keeps the hot path clean.
    const runDeviceCheck = () => {
      const ids = Object.keys(haStore.entities);
      if (ids.length === 0) return;
      if (!seededBaseline) {
        seededBaseline = true;
        notificationStore.seedBaselineIfEmpty(ids);
        return;                       // don't diff on the very first pass
      }
      notificationStore.checkForNewEntities(ids);
    };
    const firstDeviceCheck = setTimeout(runDeviceCheck, 5_000);   // let first snapshot settle
    const deviceCheckTimer = setInterval(runDeviceCheck, 60_000);

    return () => {
      _stopHa?.(); _stopIdle?.(); _stopZones?.();
      window.removeEventListener('pointerdown',   onWinPointerDown);
      window.removeEventListener('pointermove',   onWinPointerMove);
      window.removeEventListener('pointerup',     onWinPointerUp);
      window.removeEventListener('pointercancel', onWinPointerUp);
      clearTimeout(firstDeviceCheck);
      clearInterval(deviceCheckTimer);
    };
  });

  function handleWizardComplete() {
    // Config saved — isSetupDone will flip to true
  }

  // Auto-hide scrollbar: reveal the thumb only while actively scrolling,
  // fade it out ~800ms after the user stops.
  let shellMainEl = $state<HTMLElement | null>(null);
  let scrollHideTimer: ReturnType<typeof setTimeout> | null = null;

  // Pull-to-refresh — driven by dragScroll's rubber-band (it owns the pointer);
  // this just runs the actual refresh + shows the spinner.
  let refreshing = $state(false);
  async function handlePullRefresh() {
    if (refreshing) return;
    refreshing = true;
    try { await fetch('/api/settings/refresh', { method: 'POST' }); }
    catch { /* ignore */ }
    setTimeout(() => { refreshing = false; }, 700);
  }

  // ── Edge gestures (window-level; NO overlay elements, so taps still reach
  //    the BottomNav and header). Pointer events only — touch events do not fire
  //    reliably on the Waveshare DSI panel (see src/lib/actions/dragScroll.ts).
  // EDGE_BAND_TOP / EDGE_BAND_BOTTOM are imported from dragScroll so the two
  // gesture owners agree on the exact bands (single source of truth). The
  // bottom band covers the ~104px BottomNav so swipes starting on the nav
  // register reliably.
  const EDGE_TRIGGER = 48;   // px of travel required to open a panel

  let gStartY = 0;
  let gFrom: 'top' | 'bottom' | null = null;
  let gPointer: number | null = null;

  function onWinPointerDown(e: PointerEvent) {
    gFrom = null;                           // reset any stale gesture
    if (lockState.locked) return;
    if (!isSetupDone) return;               // no gestures during setup
    gPointer = e.pointerId;
    gStartY  = e.clientY;
    const h  = window.innerHeight;
    if (e.clientY <= EDGE_BAND_TOP)             gFrom = 'top';
    else if (e.clientY >= h - EDGE_BAND_BOTTOM) gFrom = 'bottom';
  }

  function onWinPointerMove(e: PointerEvent) {
    if (gFrom === null || e.pointerId !== gPointer) return;
    const dy = e.clientY - gStartY;
    if (gFrom === 'top' && dy > EDGE_TRIGGER) {
      controlOpen = true;
      gFrom = null;
    } else if (gFrom === 'bottom' && -dy > EDGE_TRIGGER) {
      notifOpen = true;
      gFrom = null;
    }
  }

  function onWinPointerUp() { gFrom = null; gPointer = null; }

  function handleShellScroll() {
    if (!shellMainEl) return;
    shellMainEl.classList.add('is-scrolling');
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
    scrollHideTimer = setTimeout(() => {
      shellMainEl?.classList.remove('is-scrolling');
    }, 800);
  }

  // While the QR screen is showing, poll /api/config every 2s to detect when
  // the phone submits the token. Server hot-reloads the WebSocket without
  // restarting, so this page never reloads — we must poll to detect the change.
  $effect(() => {
    if (isSetupRoute) return;
    if (!configLoaded) return;
    if (haTokenSet) return;   // already have token — nothing to poll

    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        if (!res.ok) return;
        const cfg = await res.json();
        if (cfg?.ha?.token) {
          configStore.set(cfg);
          if (!_stopHa)    _stopHa    = startHaStream();
          if (!_stopZones) _stopZones = startZonesStream();
          clearInterval(id);
        }
      } catch { /* server momentarily busy */ }
    }, 2000);

    return () => clearInterval(id);
  });

  // New-device detection runs on a 60s timer in onMount (not on every patch).
  let seededBaseline = false;

  // HA connection change → notification/log
  let wasConnected = true;
  $effect(() => {
    const c = haStore.connected;
    if (!c && wasConnected) {
      notificationStore.addNotification('warning', 'Home Assistant disconnected',
        'Lost connection to Home Assistant. Retrying…');
      notificationStore.addLog('HA connection lost');
    } else if (c && !wasConnected) {
      notificationStore.addLog('HA connection restored');
    }
    wasConnected = c;
  });

  let showScreensaver = $derived(isSetupDone && idleState.isIdle);

  // Track when playback last entered "paused" so the music screensaver
  // expires after 2 minutes of being paused rather than showing indefinitely.
  let pausedSince = $state<number | null>(null);
  let nowTick     = $state(Date.now());

  $effect(() => {
    const st = musicState.active?.state;
    if (st === 'paused') {
      if (pausedSince === null) pausedSince = Date.now();
    } else {
      pausedSince = null;
    }
  });

  // Only run the ticker while the screensaver is up AND playback is paused —
  // the only situation where the 2-minute grace period can expire.
  $effect(() => {
    if (!showScreensaver) return;
    if (musicState.active?.state !== 'paused') return;

    const id = setInterval(() => { nowTick = Date.now(); }, 1000);
    return () => clearInterval(id);
  });

  const PAUSE_GRACE_MS = 2 * 60 * 1000;

  let screensaverHasMusic = $derived.by(() => {
    const st = musicState.active?.state;
    if (st === 'playing') return true;
    if (st === 'paused') {
      if (pausedSince === null) return true;
      return (nowTick - pausedSince) < PAUSE_GRACE_MS;
    }
    return false;
  });

  let sectionBeforeScreensaver = $state($page.url.pathname);
  $effect(() => {
    if (!showScreensaver) sectionBeforeScreensaver = $page.url.pathname;
  });

  const EID = {
    alarm:     'alarm_control_panel.security_partition_1',
    mainDoor:  'binary_sensor.main_door',
    sideDoor:  'binary_sensor.security_zone_5',
    backPerim: 'binary_sensor.back_perimeter',
    frontPerim:'binary_sensor.front_side_perimeter',
    lights:    'switch.outdoor_lights_outlet1',
  } as const;

  function entity(id: string) { return haStore.entities[id]; }

  let alarmEntity = $derived(entity(EID.alarm));
  let alarm = $derived<AlarmState>({
    state: TRIGGERED_DEMO
      ? 'triggered'
      : ((alarmEntity?.state ?? alarmSecurityPartition1.state) as AlarmState['state']),
    attributes: {
      friendly_name:
        alarmEntity?.attributes?.friendly_name
          ?? alarmSecurityPartition1.attributes.friendly_name,
    },
  });

  function alarmPill(): PillDescriptor {
    const map: Record<string, {
      iconId: PillIconId; status: string; dotColor: string;
      isAlert: boolean; isTriggered?: boolean;
    }> = {
      disarmed:   { iconId: 'shield-check', status: 'Disarmed',
                    dotColor: 'var(--color-accent-safe)',      isAlert: false },
      armed_home: { iconId: 'shield',       status: 'Armed Home',
                    dotColor: 'var(--color-accent-triggered)', isAlert: true  },
      armed_away: { iconId: 'shield-alert', status: 'Armed Away',
                    dotColor: 'var(--color-accent-triggered)', isAlert: true  },
      triggered:  { iconId: 'shield-off',   status: 'TRIGGERED',
                    dotColor: 'var(--color-accent-triggered)', isAlert: true, isTriggered: true },
    };
    const m = map[alarm.state] ?? map['disarmed'];
    return { id: 'security', label: 'Security', ...m };
  }

  function doorState(id: string, fallback: BinarySensorState): 'on' | 'off' {
    const s = entity(id)?.state;
    return (s === 'on' || s === 'off') ? s : fallback.state;
  }

  function doorPill(id: string, label: string, state: 'on' | 'off'): PillDescriptor {
    const isOpen = state === 'on';
    return {
      id, label,
      iconId:   isOpen ? 'door-open'   : 'door-closed',
      status:   isOpen ? 'Open'        : 'Closed',
      dotColor: isOpen ? 'var(--color-accent-alert)' : 'var(--color-accent-safe)',
      isAlert:  false,
    };
  }

  let lightsOn = $derived(entity(EID.lights)?.state === 'on');

  // All sensors shown at all times — open/on pills are full opacity, closed/off are
  // rendered by StatusPillRow at reduced opacity so the bar informs without alarming.
  let pills = $derived<PillDescriptor[]>([
    alarmPill(),
    doorPill('main-door',   'Main Door',            doorState(EID.mainDoor,   binarySensorMainDoor)),
    doorPill('side-door',   'Side Door',            doorState(EID.sideDoor,   binarySensorSideDoor)),
    doorPill('back-perim',  'Back Perimeter',       doorState(EID.backPerim,  binarySensorBackPerimeter)),
    doorPill('front-perim', 'Front-Side Perimeter', doorState(EID.frontPerim, binarySensorFrontSidePerimeter)),
    {
      id: 'outdoor-lights', iconId: 'lightbulb',
      label: 'Outdoor Lights', status: lightsOn ? 'On' : 'Off',
      dotColor: lightsOn ? 'var(--color-accent-light)' : 'var(--color-accent-neutral)',
      isAlert: false,
    },
  ]);

  function isActivePill(p: PillDescriptor): boolean {
    if (p.isTriggered) return true;
    if (p.status === 'Open') return true;
    if (p.status === 'On') return true;
    if (p.status === 'Armed Home' || p.status === 'Armed Away') return true;
    return false;
  }

  let homePills = $derived(pills.filter(isActivePill));
</script>

<!-- Dev FPS overlay — self-gating on ?fps=1, zero cost otherwise -->
<FpsOverlay />

<!-- If on /setup route, ONLY render the slot (skip all kiosk logic) -->
{#if isSetupRoute}
  <slot />
{:else}
  <!-- Setup overlays: QR on kiosk (first boot), then wizard (after token) -->
  {#if configLoaded && !haTokenSet}
    <QrScreen />
  {:else if configLoaded && haTokenSet && !isSetupDone}
    <SetupWizard onComplete={handleWizardComplete} />
  {/if}

  <!-- Edge gestures are detected at window level (see onMount) — no overlay
       elements, so BottomNav / header taps are never intercepted. -->
  <ControlCenter
    open={controlOpen}
    onClose={() => controlOpen = false}
    onOpenGuestConfig={openGuestConfig}
    onExitGuest={exitGuest}
  />
  <NotificationCenter open={notifOpen} onClose={() => notifOpen = false} />

  <!-- Guest mode: config sheet + PIN-gated exit -->
  <GuestConfigSheet open={guestConfigOpen} onClose={() => guestConfigOpen = false} />
  <PinPrompt
    open={guestExitPromptOpen}
    title="Exit Guest Mode"
    subtitle="Enter your PIN to show everything again"
    onSuccess={() => { guestState.disable(); guestExitPromptOpen = false; }}
    onClose={() => guestExitPromptOpen = false}
  />

  <!-- Main dashboard layout (only when setup complete) -->
  <div class="layout" class:hidden={!configLoaded || !isSetupDone}>
    <header class="shell-header">
      <TopStrip
        haConnected={haStore.connected}
        locationLabel={configStore.display.locationLabel || 'Master Bathroom'}
      />
      {#if !isMusic && (!isHome || homePills.length > 0)}
        <div class="pill-row-wrap">
          <StatusPillRow pills={isHome ? homePills : pills} />
        </div>
      {/if}
    </header>

    <main
      class="shell-main"
      bind:this={shellMainEl}
      onscroll={handleShellScroll}
      use:dragScroll={{ onRefresh: handlePullRefresh, refreshThreshold: 90 }}
    >
      <slot />
    </main>

    <BottomNav tabs={navTabs} />

    <!-- Edge affordance hints — pill grabbers that the panels can be pulled from.
         Hidden when a panel is open or the screen is child-locked. -->
    {#if !controlOpen && !notifOpen && !lockState.locked}
      <div class="edge-hint edge-hint-top"></div>
      <div class="edge-hint edge-hint-bottom"></div>
    {/if}

    {#if refreshing}
      <div class="pull-refresh-spinner"><div class="prs-ring"></div></div>
    {/if}
  </div>

  <!-- Screensaver overlay -->
  {#if showScreensaver}
    <div transition:fade={{ duration: 400 }}>
      <MusicScreensaver
        player={screensaverHasMusic ? musicState.active : null}
        locationLabel={configStore.display.locationLabel || 'Master Bathroom'}
        temperature={haStore.entities['sensor.living_room_thermostat_current_temperature']?.state ?? null}
        calendarEvents={guestState.homeWidgetVisible('calendar') ? (haStore.calendarEvents ?? []) : []}
        pills={pills}
        notifCount={notificationStore.unreadCount}
        onClose={() => {
          window.dispatchEvent(new MouseEvent('mousemove'));
          if (sectionBeforeScreensaver && sectionBeforeScreensaver !== $page.url.pathname) {
            window.history.pushState(null, '', sectionBeforeScreensaver);
          }
        }}
      />
    </div>
  {/if}
{/if}

<!-- Child-lock overlay — sits above EVERYTHING (setup, kiosk, screensaver) -->
<ChildLockOverlay />

<style>
  :global(body) {
    margin: 0;
    background-color: var(--color-canvas);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    /* Touch kiosk: never select/highlight text. Swiping panels (Control /
       Notification Center) was drag-selecting the text underneath. */
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  /* …but text fields must still allow a caret + selection (wizard room name). */
  :global(input),
  :global(textarea) {
    -webkit-user-select: text;
    user-select: text;
  }

  .layout {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
  }

  .layout.hidden {
    display: none;
  }

  /* Header stays pinned because it's a flex-shrink:0 sibling outside the
     scrollable .shell-main — not because of sticky positioning (which does
     nothing useful here since this element never scrolls with its content). */
  .shell-header {
    flex-shrink: 0;
    padding: clamp(14px, 1.8vh, 24px) clamp(14px, 1.8vw, 24px) clamp(10px, 1.2vh, 16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: var(--color-canvas);
  }

  .pill-row-wrap {
    padding-top: clamp(10px, 1.3vh, 18px);
  }

  /* Main content — scrollable, touch-friendly.
     Scrolling is driven by the dragScroll action (use:dragScroll), not native
     overflow drag — on this touchscreen, native touch-scroll gesture
     recognition doesn't reliably engage across the nested fixed/flex
     container chain, so dragging falls back to text-selection instead of
     scrolling. dragScroll drives scrollTop directly from pointer events,
     sidestepping that entirely (see src/lib/actions/dragScroll.ts). */
  .shell-main {
    flex: 1;
    min-height: 0;                 /* critical: lets this flex child scroll */
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: auto;
    -webkit-user-select: none;
    user-select: none;
    position: relative;

    /* Auto-hide scrollbar: transparent track, thumb only shows while scrolling */
    scrollbar-width: thin;                       /* Firefox */
    scrollbar-color: transparent transparent;    /* hidden at rest (FF) */
    transition: scrollbar-color 300ms;
  }

  /* When actively scrolling (JS adds .is-scrolling), reveal the FF thumb */
  .shell-main.is-scrolling {
    scrollbar-color: rgba(255,255,255,0.25) transparent;
  }

  /* Edge affordance hints — subtle grabber pills at top & bottom edges */
  .edge-hint {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    width: 120px; height: 5px;
    border-radius: 3px;
    background: var(--color-text-tertiary);
    opacity: 0.24;
    z-index: 200;               /* above content, below panels (400) */
    pointer-events: none;
  }
  .edge-hint-top    { top: 6px; }
  .edge-hint-bottom { bottom: 6px; }

  /* Pull-to-refresh spinner */
  .pull-refresh-spinner {
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    z-index: 210; pointer-events: none;
  }
  .prs-ring {
    width: 30px; height: 30px; border-radius: 50%;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-text-secondary);
    animation: prs-spin 0.8s linear infinite;
  }
  @keyframes prs-spin { to { transform: rotate(360deg); } }

  /* WebKit (Chromium on the Pi): thin transparent track, thumb fades in on scroll */
  .shell-main::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
  .shell-main::-webkit-scrollbar-track {
    background: transparent;
  }
  .shell-main::-webkit-scrollbar-thumb {
    background: transparent;            /* invisible at rest */
    border-radius: 4px;
    transition: background 300ms;
  }
  .shell-main.is-scrolling::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.25); /* visible while scrolling */
  }

</style>
