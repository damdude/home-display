<script lang="ts">
  import { onMount } from 'svelte';

  import TopStrip            from '$lib/components/TopStrip.svelte';
  import StatusPillRow       from '$lib/components/StatusPillRow.svelte';
  import WeatherStrip        from '$lib/components/WeatherStrip.svelte';
  import CalendarPlaceholder from '$lib/components/CalendarPlaceholder.svelte';
  import ClimateSplit        from '$lib/components/ClimateSplit.svelte';
  import QuickShortcuts      from '$lib/components/QuickShortcuts.svelte';
  import MediaNowPlaying     from '$lib/components/MediaNowPlaying.svelte';

  import {
    weatherForecastHome,
    climateLivingRoomThermostat,
    alarmSecurityPartition1,
    binarySensorMainDoor,
    binarySensorSideDoor,
    binarySensorBackPerimeter,
    binarySensorFrontSidePerimeter,
    mediaPlayerMaindoorSpeaker,
    mediaPlayerDemoPlaying,
    MUSIC_DEMO_PLAYING,
    TRIGGERED_DEMO,
    type BinarySensorState,
    type PillDescriptor,
    type PillIconId,
  } from '$lib/data/placeholder.js';

  import { startDoorSimulation, type DoorKey } from '$lib/data/simulateChanges.js';

  // ── Reactive sensor state ──────────────────────────────────────────────────

  // When TRIGGERED_DEMO is on, start in triggered state for visual validation
  const alarm = $state({
    ...(TRIGGERED_DEMO
      ? { state: 'triggered' as const, attributes: { friendly_name: 'Home Security' } }
      : alarmSecurityPartition1),
  });

  const doors = $state({
    mainDoor:           { ...binarySensorMainDoor }           as BinarySensorState,
    sideDoor:           { ...binarySensorSideDoor }           as BinarySensorState,
    backPerimeter:      { ...binarySensorBackPerimeter }      as BinarySensorState,
    frontSidePerimeter: { ...binarySensorFrontSidePerimeter } as BinarySensorState,
  });

  const lightsOn = $state(false);

  // ── Derive pill descriptors ────────────────────────────────────────────────

  function alarmPill(): PillDescriptor {
    const map: Record<string, {
      iconId: PillIconId;
      status: string;
      dotColor: string;
      isAlert: boolean;
      isTriggered?: boolean;
    }> = {
      disarmed:   {
        iconId: 'shield-check', status: 'Disarmed',
        dotColor: 'var(--color-accent-safe)', isAlert: false,
      },
      armed_home: {
        iconId: 'shield', status: 'Armed Home',
        dotColor: 'var(--color-accent-triggered)', isAlert: true,
      },
      armed_away: {
        iconId: 'shield-alert', status: 'Armed Away',
        dotColor: 'var(--color-accent-triggered)', isAlert: true,
      },
      triggered: {
        iconId: 'shield-off', status: 'TRIGGERED',
        dotColor: 'var(--color-accent-triggered)', isAlert: true, isTriggered: true,
      },
    };
    const m = map[alarm.state] ?? map['disarmed'];
    return { id: 'security', label: 'Security', ...m };
  }

  function doorPill(id: string, label: string, state: 'on' | 'off'): PillDescriptor {
    const isOpen = state === 'on';
    return {
      id,
      iconId:   isOpen ? 'door-open' : 'door-closed',
      label,
      status:   isOpen ? 'Open' : 'Closed',
      dotColor: isOpen ? 'var(--color-accent-alert)' : 'var(--color-accent-safe)',
      isAlert:  false,  // open door = wheat, not alarming red
    };
  }

  let pills = $derived<PillDescriptor[]>([
    alarmPill(),
    doorPill('main-door',   'Main Door',            doors.mainDoor.state),
    doorPill('side-door',   'Side Door',            doors.sideDoor.state),
    doorPill('back-perim',  'Back Perimeter',       doors.backPerimeter.state),
    doorPill('front-perim', 'Front-Side Perimeter', doors.frontSidePerimeter.state),
    {
      id:       'outdoor-lights',
      iconId:   'lightbulb',
      label:    'Outdoor Lights',
      status:   lightsOn ? 'On' : 'Off',
      dotColor: lightsOn ? 'var(--color-accent-light)' : 'var(--color-accent-neutral)',
      isAlert:  false,
    },
  ]);

  // ── Simulations ────────────────────────────────────────────────────────────

  onMount(() => {
    return startDoorSimulation((key: DoorKey, newState: BinarySensorState) => {
      doors[key] = newState;
    });
  });

  const mediaPlayer = MUSIC_DEMO_PLAYING ? mediaPlayerDemoPlaying : mediaPlayerMaindoorSpeaker;
</script>

<div class="home">
  <!-- Zone 1: Top strip (clock + greeting + theme toggle) -->
  <section class="zone zone-top">
    <TopStrip />
  </section>

  <!-- Zone 2: Status pill row -->
  <section class="zone zone-pills">
    <StatusPillRow {pills} />
  </section>

  <!-- Zone 3: Weather -->
  <section class="zone zone-weather">
    <WeatherStrip weather={weatherForecastHome} />
  </section>

  <!-- Zone 4: Calendar -->
  <section class="zone zone-calendar">
    <CalendarPlaceholder />
  </section>

  <!-- Zone 5: Climate (two tiles) -->
  <section class="zone zone-climate">
    <ClimateSplit climate={climateLivingRoomThermostat} />
  </section>

  <!-- Zone 6: Quick shortcuts -->
  <section class="zone zone-shortcuts">
    <QuickShortcuts />
  </section>

  <!-- Zone 7: Now playing -->
  <section class="zone zone-media">
    <MediaNowPlaying player={mediaPlayer} />
  </section>
</div>

<style>
  .home {
    height: 100%;
    display: grid;
    grid-template-rows: auto auto 16fr 10fr 13fr 9fr 14fr;
    row-gap: clamp(5px, 0.7vh, 10px);
    padding: clamp(6px, 0.6vh, 10px) 5vw clamp(4px, 0.4vh, 8px);
    overflow: hidden;
    box-sizing: border-box;
  }

  .zone {
    min-height: 0;
    overflow: hidden;
  }

  /* Pills zone must not clip wrapped rows */
  .zone-pills {
    overflow: visible;
  }
</style>
