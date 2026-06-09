<script lang="ts">
  import '../app.css';
  import { onMount }  from 'svelte';
  import { fade }     from 'svelte/transition';
  import { page }     from '$app/stores';
  import type { Snippet } from 'svelte';
  import TopStrip         from '$lib/components/TopStrip.svelte';
  import StatusPillRow    from '$lib/components/StatusPillRow.svelte';
  import BottomNav        from '$lib/components/BottomNav.svelte';
  import MusicScreensaver from '$lib/components/music/MusicScreensaver.svelte';
  import QrScreen         from '$lib/components/setup/QrScreen.svelte';
  import SetupWizard      from '$lib/components/setup/SetupWizard.svelte';
  import { startHaStream }       from '$lib/stores/ha.svelte.js';
  import { startZonesStream }    from '$lib/stores/zonesStore.svelte.js';
  import { haStore }             from '$lib/stores/ha.svelte.js';
  import { musicState }          from '$lib/stores/musicState.svelte.js';
  import { idleState, startIdleDetection } from '$lib/stores/idleDetection.svelte.js';
  import { configStore }         from '$lib/stores/configStore.svelte.js';

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

  let haTokenSet  = $derived(configStore.haTokenSet());
  let isSetupDone = $derived(configStore.isSetupDone());
  
  // CRITICAL: Skip ALL kiosk logic if on /setup route
  let isSetupRoute = $derived($page.url.pathname === '/setup');

  onMount(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) configStore.set(await res.json());
    } catch { /* server may be starting */ }

    configLoaded = true;

    if (configStore.haTokenSet()) {
      // Start HA + zones streams as soon as we have credentials (wizard needs entity data)
      _stopHa    = startHaStream();
      _stopZones = startZonesStream();

      // Start idle detection only when fully set up (no screensaver during wizard)
      if (configStore.isSetupDone()) {
        _stopIdle = startIdleDetection();
      }
    }

    return () => { _stopHa?.(); _stopIdle?.(); _stopZones?.(); };
  });

  function handleWizardComplete() {
    // Config saved — isSetupDone will flip to true
  }

  let showScreensaver = $derived(isSetupDone && idleState.isIdle);
  let screensaverHasMusic = $derived(
    musicState.active?.state === 'playing' || musicState.active?.state === 'paused',
  );

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

  let pills = $derived<PillDescriptor[]>([
    alarmPill(),
    doorPill('main-door',   'Main Door',            doorState(EID.mainDoor,   binarySensorMainDoor)),
    doorPill('side-door',   'Side Door',            doorState(EID.sideDoor,   binarySensorSideDoor)),
    doorPill('back-perim',  'Back Perimeter',       doorState(EID.backPerim,  binarySensorBackPerimeter)),
    doorPill('front-perim', 'Front-Side Perimeter', doorState(EID.frontPerim, binarySensorFrontSidePerimeter)),
    {
      id:       'outdoor-lights',
      iconId:   'lightbulb',
      label:    'Outdoor Lights',
      status:   lightsOn ? 'On' : 'Off',
      dotColor: lightsOn ? 'var(--color-accent-light)' : 'var(--color-accent-neutral)',
      isAlert:  false,
    },
  ]);
</script>

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

  <!-- Main dashboard layout (only when setup complete) -->
  <div class="layout" class:hidden={!configLoaded || !isSetupDone}>
    <header class="shell-header">
      <TopStrip
        haConnected={haStore.connected}
        locationLabel={configStore.display.locationLabel || 'Master Bathroom'}
      />
    </header>

    <StatusPillRow {pills} />

    <main class="shell-main">
      <slot />
    </main>

    <BottomNav tabs={configStore.tabs} />
  </div>

  <!-- Screensaver overlay -->
  {#if showScreensaver}
    <div transition:fade={{ duration: 400 }}>
      <MusicScreensaver
        player={screensaverHasMusic ? musicState.active : null}
        locationLabel={configStore.display.locationLabel || 'Master Bathroom'}
        temperature={haStore.entities['sensor.living_room_thermostat_current_temperature']?.state ?? null}
        calendarEvents={haStore.calendarEvents ?? []}
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

<style>
  :global(:root) {
    --color-canvas: #0a0a0c;
    --color-surface-1: #1a1a1f;
    --color-surface-2: #232328;
    --color-text-primary: #ffffff;
    --color-text-secondary: rgba(255, 255, 255, 0.65);
    --color-text-tertiary: rgba(255, 255, 255, 0.45);
    --color-accent-music: #9b7bb5;
    --color-accent-safe: #6b9b7d;
    --color-accent-triggered: #d67c7c;
    --color-accent-alert: #f0b96f;
    --color-accent-light: #f0d96f;
    --color-accent-neutral: rgba(255, 255, 255, 0.25);
  }

  :global(body) {
    margin: 0;
    background-color: var(--color-canvas);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .layout {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    opacity: 1;
    transition: opacity 300ms ease;
  }

  .layout.hidden {
    display: none;
  }

  .shell-header {
    flex-shrink: 0;
    padding: clamp(12px, 1.5vh, 20px) clamp(16px, 2vw, 32px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .shell-main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
