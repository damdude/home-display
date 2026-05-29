<script lang="ts">
  import { onMount } from 'svelte';

  import ClockGreeting        from '$lib/components/ClockGreeting.svelte';
  import WeatherStrip         from '$lib/components/WeatherStrip.svelte';
  import CalendarPlaceholder  from '$lib/components/CalendarPlaceholder.svelte';
  import ThermostatCard       from '$lib/components/ThermostatCard.svelte';
  import DoorsGrid            from '$lib/components/DoorsGrid.svelte';
  import MediaNowPlaying      from '$lib/components/MediaNowPlaying.svelte';
  import QuickShortcuts       from '$lib/components/QuickShortcuts.svelte';

  import {
    weatherForecastHome,
    climateLivingRoomThermostat,
    binarySensorMainDoor,
    binarySensorSideDoor,
    binarySensorBackPerimeter,
    binarySensorFrontSidePerimeter,
    mediaPlayerMaindoorSpeaker,
    type BinarySensorState,
  } from '$lib/data/placeholder.js';

  import { startDoorSimulation, type DoorKey } from '$lib/data/simulateChanges.js';

  // ── Reactive state ─────────────────────────────────────────────────────────

  const doors = $state({
    mainDoor:           { ...binarySensorMainDoor }           as BinarySensorState,
    sideDoor:           { ...binarySensorSideDoor }           as BinarySensorState,
    backPerimeter:      { ...binarySensorBackPerimeter }      as BinarySensorState,
    frontSidePerimeter: { ...binarySensorFrontSidePerimeter } as BinarySensorState,
  });

  const pulseCounts = $state({
    mainDoor:           0,
    sideDoor:           0,
    backPerimeter:      0,
    frontSidePerimeter: 0,
  });

  // ── Simulation ─────────────────────────────────────────────────────────────

  onMount(() => {
    return startDoorSimulation((key: DoorKey, newState: BinarySensorState) => {
      doors[key]       = newState;
      pulseCounts[key] = pulseCounts[key] + 1;
    });
  });
</script>

<div class="home">
  <!-- Zone 1: Clock + greeting -->
  <section class="zone zone-clock">
    <ClockGreeting />
  </section>

  <!-- Zone 2: Weather -->
  <section class="zone zone-weather">
    <WeatherStrip weather={weatherForecastHome} />
  </section>

  <!-- Zone 3: Calendar -->
  <section class="zone zone-calendar">
    <CalendarPlaceholder />
  </section>

  <!-- Zone 4: Thermostat -->
  <section class="zone zone-thermostat">
    <ThermostatCard climate={climateLivingRoomThermostat} />
  </section>

  <!-- Zone 5: Doors -->
  <section class="zone zone-doors">
    <DoorsGrid
      mainDoor={doors.mainDoor}
      sideDoor={doors.sideDoor}
      backPerimeter={doors.backPerimeter}
      frontSidePerimeter={doors.frontSidePerimeter}
      {pulseCounts}
    />
  </section>

  <!-- Zone 6: Now playing -->
  <section class="zone zone-media">
    <MediaNowPlaying player={mediaPlayerMaindoorSpeaker} />
  </section>

  <!-- Zone 7: Quick shortcuts -->
  <section class="zone zone-shortcuts">
    <QuickShortcuts />
  </section>
</div>

<style>
  .home {
    height: 100%;
    display: grid;
    /* Zones proportional to spec: 9 17 10 13 13 10 8 (of 80) + row-gap */
    grid-template-rows: 9fr 17fr 10fr 13fr 13fr 10fr 8fr;
    row-gap: clamp(6px, 0.9vh, 14px);
    padding: clamp(6px, 0.8vh, 12px) 5vw;
    overflow: hidden;
    box-sizing: border-box;
  }

  .zone {
    min-height: 0;
    overflow: hidden;
  }
</style>
