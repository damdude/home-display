<script lang="ts">
  import '../app.css';
  import { onMount }  from 'svelte';
  import { fade }     from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { page }     from '$app/stores';
  import type { Snippet } from 'svelte';
  import TopStrip         from '$lib/components/TopStrip.svelte';
  import StatusPillRow    from '$lib/components/StatusPillRow.svelte';
  import BottomNav        from '$lib/components/BottomNav.svelte';
  import MusicScreensaver from '$lib/components/music/MusicScreensaver.svelte';
  import { startHaStream }       from '$lib/stores/ha.svelte.js';
  import { startZonesStream }    from '$lib/stores/zonesStore.svelte.js';
  import { haStore }             from '$lib/stores/ha.svelte.js';
  import { musicState }          from '$lib/stores/musicState.svelte.js';
  import { idleState, startIdleDetection } from '$lib/stores/idleDetection.svelte.js';

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

  // ── HA stream + idle detection ─────────────────────────────────────────────
  onMount(() => {
    const stopHa    = startHaStream();
    const stopIdle  = startIdleDetection();
    const stopZones = startZonesStream();
    return () => { stopHa(); stopIdle(); stopZones(); };
  });

  // ── Screensaver trigger ─────────────────────────────────────────────────────
  // Show when: user idle AND at least one media_player is "playing"
  let showScreensaver = $derived(
    idleState.isIdle && musicState.active?.state === 'playing',
  );

  // Remember the section the user was on so we can return after dismissal
  let sectionBeforeScreensaver = $state($page.url.pathname);
  $effect(() => {
    if (!showScreensaver) sectionBeforeScreensaver = $page.url.pathname;
  });

  // ── Entity ID constants (shared with +page.svelte) ──────────────────────────
  const EID = {
    alarm:     'alarm_control_panel.security_partition_1',
    mainDoor:  'binary_sensor.main_door',
    sideDoor:  'binary_sensor.security_zone_5',
    backPerim: 'binary_sensor.back_perimeter',
    frontPerim:'binary_sensor.front_side_perimeter',
    lights:    'switch.outdoor_lights_outlet1',
  } as const;

  function entity(id: string) { return haStore.entities[id]; }

  // ── Alarm pill ──────────────────────────────────────────────────────────────
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

  // ── Door pills ──────────────────────────────────────────────────────────────
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

  // ── Lights pill ─────────────────────────────────────────────────────────────
  let lightsOn = $derived(entity(EID.lights)?.state === 'on');

  // ── Combined pills (global, visible on all sections) ───────────────────────
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

<div class="layout">
  <!-- Shared header: clock + greeting + bell + theme toggle -->
  <header class="shell-header">
    <TopStrip haConnected={haStore.connected} />
  </header>

  <!-- Global status pill row — visible on every section -->
  <div class="shell-pills">
    <StatusPillRow {pills} />
  </div>

  <!-- Per-section content with opacity crossfade on route change -->
  <main class="content">
    {#key $page.url.pathname}
      <div
        class="route-fade"
        in:fade={{ duration: 300, delay: 200, easing: cubicOut }}
        out:fade={{ duration: 200, easing: cubicOut }}
      >
        {@render children()}
      </div>
    {/key}
  </main>

  <BottomNav />
</div>

<!-- Music screensaver — fixed overlay above everything else (z-index 200) -->
{#if showScreensaver && musicState.active}
  <MusicScreensaver
    player={musicState.active}
    onClose={() => {
      // Dismiss: reset idle timer by simulating user activity
      window.dispatchEvent(new MouseEvent('mousemove'));
    }}
  />
{/if}

<style>
  .layout {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background: var(--color-canvas);
  }

  /* Shared header — matches the padding Home uses */
  .shell-header {
    padding: clamp(6px, 0.6vh, 10px) 5vw 0;
  }

  /* Pill row — same horizontal edges as tiles */
  .shell-pills {
    padding: clamp(3px, 0.4vh, 6px) 5vw 0;
    overflow: visible;
  }

  /* Per-section content area */
  .content {
    overflow: hidden;
    min-height: 0;
    position: relative;
  }

  /* Crossfade wrapper — fills the content area */
  .route-fade {
    position: absolute;
    inset: 0;
  }
</style>
