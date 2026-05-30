<script lang="ts">
  import { onMount } from 'svelte';

  import TopStrip          from '$lib/components/TopStrip.svelte';
  import StatusPillRow     from '$lib/components/StatusPillRow.svelte';
  import WeatherStrip      from '$lib/components/WeatherStrip.svelte';
  import CalendarPlaceholder from '$lib/components/CalendarPlaceholder.svelte';
  import ClimateSplit      from '$lib/components/ClimateSplit.svelte';
  import QuickShortcuts    from '$lib/components/QuickShortcuts.svelte';
  import MediaNowPlaying   from '$lib/components/MediaNowPlaying.svelte';

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
    type BinarySensorState,
    type PillDescriptor,
    type PillIconId,
  } from '$lib/data/placeholder.js';

  import { startDoorSimulation, type DoorKey } from '$lib/data/simulateChanges.js';

  // ── Reactive sensor state ──────────────────────────────────────────────────

  const alarm = $state({ ...alarmSecurityPartition1 });

  const doors = $state({
    mainDoor:           { ...binarySensorMainDoor }           as BinarySensorState,
    sideDoor:           { ...binarySensorSideDoor }           as BinarySensorState,
    backPerimeter:      { ...binarySensorBackPerimeter }      as BinarySensorState,
    frontSidePerimeter: { ...binarySensorFrontSidePerimeter } as BinarySensorState,
  });

  // Outdoor lights: placeholder static state
  const lightsOn = $state(false);

  // ── Derive pill descriptors from reactive state ────────────────────────────

  function alarmPill(): PillDescriptor {
    const map: Record<string, { iconId: PillIconId; status: string; dotColor: string; isAlert: boolean }> = {
      disarmed:   { iconId: 'shield-check', status: 'Disarmed',   dotColor: 'var(--color-accent-safe)',    isAlert: false },
      armed_home: { iconId: 'shield',       status: 'Armed Home', dotColor: 'var(--color-accent-climate)', isAlert: false },
      armed_away: { iconId: 'shield-alert', status: 'Armed Away', dotColor: 'var(--color-accent-climate)', isAlert: false },
      triggered:  { iconId: 'shield-off',   status: 'TRIGGERED',  dotColor: 'var(--color-accent-alert)',   isAlert: true  },
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
      isAlert:  isOpen,
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

  // ── Door simulation ────────────────────────────────────────────────────────

  onMount(() => {
    return startDoorSimulation((key: DoorKey, newState: BinarySensorState) => {
      doors[key] = newState;
    });
  });

  // ── Music player ──────────────────────────────────────────────────────────

  const mediaPlayer = MUSIC_DEMO_PLAYING ? mediaPlayerDemoPlaying : mediaPlayerMaindoorSpeaker;
</script>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PALETTE PREVIEW — TEMPORARY SCAFFOLDING
     Remove this entire block after picking a palette letter (A/B/C/D).
     The pair you choose becomes the new accent-safe / accent-alert values
     in tokens.ts and app.css.
════════════════════════════════════════════════════════════════════════════ -->
<div class="palette-preview" aria-hidden="true">
  <span class="pp-heading">Palette preview — pick A / B / C / D</span>
  <div class="pp-pairs">
    <!-- A — sage/coral (current) -->
    <div class="pp-pair">
      <span class="pp-letter">A</span>
      <span class="pp-pill" style:--pc="#6B9B7D">
        <span class="pp-dot" style:background="#6B9B7D"></span>Closed
      </span>
      <span class="pp-pill pp-alert" style:--pc="#C66B6B">
        <span class="pp-dot" style:background="#C66B6B"></span>Open
      </span>
      <span class="pp-names">sage / coral</span>
    </div>
    <!-- B — moss/rust -->
    <div class="pp-pair">
      <span class="pp-letter">B</span>
      <span class="pp-pill" style:--pc="#7C9B86">
        <span class="pp-dot" style:background="#7C9B86"></span>Closed
      </span>
      <span class="pp-pill pp-alert" style:--pc="#B8847B">
        <span class="pp-dot" style:background="#B8847B"></span>Open
      </span>
      <span class="pp-names">moss / rust</span>
    </div>
    <!-- C — lichen/clay -->
    <div class="pp-pair">
      <span class="pp-letter">C</span>
      <span class="pp-pill" style:--pc="#9DB5A0">
        <span class="pp-dot" style:background="#9DB5A0"></span>Closed
      </span>
      <span class="pp-pill pp-alert" style:--pc="#C8967F">
        <span class="pp-dot" style:background="#C8967F"></span>Open
      </span>
      <span class="pp-names">lichen / clay</span>
    </div>
    <!-- D — warm earth -->
    <div class="pp-pair">
      <span class="pp-letter">D</span>
      <span class="pp-pill" style:--pc="#A89876">
        <span class="pp-dot" style:background="#A89876"></span>Closed
      </span>
      <span class="pp-pill pp-alert" style:--pc="#B8755F">
        <span class="pp-dot" style:background="#B8755F"></span>Open
      </span>
      <span class="pp-names">warm earth / sienna</span>
    </div>
  </div>
</div>
<!-- END PALETTE PREVIEW -->

<div class="home">
  <!-- Zone 1: Top strip -->
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
  /* ── Palette preview (temporary scaffolding) ───────────────────────────── */
  .palette-preview {
    background: var(--color-surface-2);
    border-bottom: 1px solid var(--color-border);
    padding: 8px 5vw;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pp-heading {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-tertiary);
  }

  .pp-pairs {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: center;
  }

  .pp-pair {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pp-letter {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-tertiary);
    width: 12px;
  }

  .pp-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px 4px 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pc) 12%, var(--color-surface-1));
    border: 1px solid color-mix(in srgb, var(--pc) 30%, transparent);
    color: color-mix(in srgb, var(--pc) 85%, var(--color-text-primary));
    font-size: 12px;
    font-weight: 500;
  }

  .pp-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .pp-names {
    font-size: 10px;
    color: var(--color-text-tertiary);
    white-space: nowrap;
  }

  /* ── Home grid ── */
  .home {
    height: 100%;
    display: grid;
    /* top auto: top strip; pills auto: wraps to content; rest fr */
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
