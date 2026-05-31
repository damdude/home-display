<script lang="ts">
  import TopStrip            from '$lib/components/TopStrip.svelte';
  import StatusPillRow       from '$lib/components/StatusPillRow.svelte';
  import WeatherStrip        from '$lib/components/WeatherStrip.svelte';
  import CalendarPlaceholder from '$lib/components/CalendarPlaceholder.svelte';
  import ClimateSplit        from '$lib/components/ClimateSplit.svelte';
  import QuickShortcuts      from '$lib/components/QuickShortcuts.svelte';
  import MediaNowPlaying     from '$lib/components/MediaNowPlaying.svelte';

  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';

  import {
    weatherForecastHome,
    climateLivingRoomThermostat,
    alarmSecurityPartition1,
    binarySensorMainDoor,
    binarySensorSideDoor,
    binarySensorBackPerimeter,
    binarySensorFrontSidePerimeter,
    mediaPlayerMaindoorSpeaker,
    MUSIC_DEMO_PLAYING,
    TRIGGERED_DEMO,
    mediaPlayerDemoPlaying,
    type ClimateState,
    type AlarmState,
    type BinarySensorState,
    type MediaPlayerState,
    type PillDescriptor,
    type PillIconId,
  } from '$lib/data/placeholder.js';

  // ── Entity ID constants ────────────────────────────────────────────────────
  const EID = {
    weather:    'weather.forecast_home',
    climate:    'climate.living_room_thermostat',
    humidity:   'sensor.living_room_thermostat_current_humidity',
    temperature:'sensor.living_room_thermostat_current_temperature',
    alarm:      'alarm_control_panel.security_partition_1',
    mainDoor:   'binary_sensor.main_door',
    sideDoor:   'binary_sensor.security_zone_5',
    backPerim:  'binary_sensor.back_perimeter',
    frontPerim: 'binary_sensor.front_side_perimeter',
    lights:     'switch.outdoor_lights_outlet1',
    media:      'media_player.maindoor_speaker',
  } as const;

  // ── Helper: read entity state with fallback ─────────────────────────────────
  function entity(id: string) { return haStore.entities[id]; }

  // ── Location name ────────────────────────────────────────────────────────────
  // Priority: HA config location_name → weather entity location attr → friendly_name
  let locationName = $derived(() => {
    if (haStore.locationName) return haStore.locationName;
    const w = entity(EID.weather);
    if (w?.attributes?.location) return String(w.attributes.location);
    // Friendly name fallback: strip "Forecast" word, trim
    const fn: string = w?.attributes?.friendly_name ?? '';
    if (fn) return fn.replace(/forecast/i, '').trim().replace(/^,|,$/g, '').trim();
    return '';
  });

  // ── Weather ─────────────────────────────────────────────────────────────────
  let weatherEntity = $derived(entity(EID.weather));
  let weather = $derived({
    state: weatherEntity?.state ?? weatherForecastHome.state,
    attributes: {
      temperature:      weatherEntity?.attributes?.temperature      ?? weatherForecastHome.attributes.temperature,
      temperature_unit: weatherEntity?.attributes?.temperature_unit ?? weatherForecastHome.attributes.temperature_unit,
      humidity:         weatherEntity?.attributes?.humidity         ?? weatherForecastHome.attributes.humidity,
      forecast:         weatherForecastHome.attributes.forecast, // legacy fallback only
    },
  });

  // Forecast comes from the server's separate forecast message (haStore.forecast),
  // with placeholder data as fallback until the first forecast arrives
  let activeForecast = $derived(
    haStore.forecast.length > 0
      ? haStore.forecast
      : weatherForecastHome.attributes.forecast
  );

  // ── Climate ─────────────────────────────────────────────────────────────────
  let climateEntity   = $derived(entity(EID.climate));
  let humidityEntity  = $derived(entity(EID.humidity));
  let tempSensorEntity= $derived(entity(EID.temperature));

  let climate = $derived<ClimateState>({
    state: (climateEntity?.state ?? climateLivingRoomThermostat.state) as ClimateState['state'],
    attributes: {
      current_temperature:
        tempSensorEntity?.state != null
          ? parseFloat(tempSensorEntity.state)
          : (climateEntity?.attributes?.current_temperature
              ?? climateLivingRoomThermostat.attributes.current_temperature),
      // Single-value setpoint (heat / cool modes)
      temperature:
        climateEntity?.attributes?.temperature != null
          ? parseFloat(String(climateEntity.attributes.temperature))
          : undefined,
      target_temp_low:
        climateEntity?.attributes?.target_temp_low
          ?? climateLivingRoomThermostat.attributes.target_temp_low,
      target_temp_high:
        climateEntity?.attributes?.target_temp_high
          ?? climateLivingRoomThermostat.attributes.target_temp_high,
      hvac_action:
        climateEntity?.attributes?.hvac_action
          ?? climateLivingRoomThermostat.attributes.hvac_action,
    },
  });

  let humidity = $derived(
    humidityEntity?.state != null
      ? parseFloat(humidityEntity.state)
      : null
  );

  // Climate controls → service calls (mode-aware)
  function adjustSetpoint(delta: number) {
    const state = climate.state;
    if (state === 'off') return; // disabled

    if (state === 'heat' || state === 'cool') {
      // Single setpoint mode: adjust the 'temperature' attribute
      const current = climate.attributes.temperature ?? climate.attributes.target_temp_high;
      callHaService('climate', 'set_temperature', {
        entity_id:   EID.climate,
        temperature: current + delta,
      });
    } else {
      // Auto mode: + adjusts high, − adjusts low (v1 UX)
      if (delta > 0) {
        callHaService('climate', 'set_temperature', {
          entity_id:        EID.climate,
          target_temp_low:  climate.attributes.target_temp_low,
          target_temp_high: climate.attributes.target_temp_high + delta,
        });
      } else {
        callHaService('climate', 'set_temperature', {
          entity_id:        EID.climate,
          target_temp_low:  climate.attributes.target_temp_low  + delta,
          target_temp_high: climate.attributes.target_temp_high,
        });
      }
    }
  }

  function setClimateMode(mode: 'heat' | 'cool' | 'heat_cool' | 'off') {
    callHaService('climate', 'set_hvac_mode', {
      entity_id: EID.climate,
      hvac_mode: mode,
    });
  }

  // ── Alarm + doors → pills ────────────────────────────────────────────────────
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

  function doorState(id: string, fallback: BinarySensorState): 'on' | 'off' {
    const s = entity(id)?.state;
    return (s === 'on' || s === 'off') ? s : fallback.state;
  }

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

  let lightsEntity = $derived(entity(EID.lights));
  let lightsOn = $derived(lightsEntity?.state === 'on');

  let pills = $derived<PillDescriptor[]>([
    alarmPill(),
    doorPill('main-door',   'Main Door',            doorState(EID.mainDoor,  binarySensorMainDoor)),
    doorPill('side-door',   'Side Door',            doorState(EID.sideDoor,  binarySensorSideDoor)),
    doorPill('back-perim',  'Back Perimeter',       doorState(EID.backPerim, binarySensorBackPerimeter)),
    doorPill('front-perim', 'Front-Side Perimeter', doorState(EID.frontPerim,binarySensorFrontSidePerimeter)),
    {
      id:       'outdoor-lights',
      iconId:   'lightbulb',
      label:    'Outdoor Lights',
      status:   lightsOn ? 'On' : 'Off',
      dotColor: lightsOn ? 'var(--color-accent-light)' : 'var(--color-accent-neutral)',
      isAlert:  false,
    },
  ]);

  // ── Outdoor lights toggle ────────────────────────────────────────────────────
  function toggleOutdoorLights() {
    callHaService('switch', 'toggle', { entity_id: EID.lights });
  }

  // ── Media player ─────────────────────────────────────────────────────────────
  let mediaEntity = $derived(entity(EID.media));
  let mediaPlayer = $derived<MediaPlayerState>(
    MUSIC_DEMO_PLAYING
      ? mediaPlayerDemoPlaying
      : {
          state: mediaEntity?.state ?? mediaPlayerMaindoorSpeaker.state,
          attributes: {
            media_title:    mediaEntity?.attributes?.media_title    ?? null,
            media_artist:   mediaEntity?.attributes?.media_artist   ?? null,
            entity_picture: mediaEntity?.attributes?.entity_picture ?? null,
          },
        }
  );
</script>

<div class="home">
  <!-- Zone 1: Top strip (clock + greeting + bell + theme toggle) -->
  <section class="zone zone-top">
    <TopStrip haConnected={haStore.connected} />
  </section>

  <!-- Zone 2: Status pill row -->
  <section class="zone zone-pills">
    <StatusPillRow {pills} />
  </section>

  <!-- Zone 3: Weather -->
  <section class="zone zone-weather">
    <WeatherStrip {weather} forecast={activeForecast} locationName={locationName()} />
  </section>

  <!-- Zone 4: Calendar -->
  <section class="zone zone-calendar">
    <CalendarPlaceholder />
  </section>

  <!-- Zone 5: Climate (two tiles) -->
  <section class="zone zone-climate">
    <ClimateSplit
      {climate}
      {humidity}
      onAdjustSetpoint={adjustSetpoint}
      onSetMode={setClimateMode}
    />
  </section>

  <!-- Zone 6: Quick shortcuts -->
  <section class="zone zone-shortcuts">
    <QuickShortcuts
      outdoorLightsOn={lightsOn}
      onToggleOutdoorLights={toggleOutdoorLights}
    />
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

  /* Pills zone: wider than the rest — extends 2vw beyond the page padding on
     each side. Overflow visible so wrapped rows aren't clipped. */
  .zone-pills {
    overflow: visible;
    margin-inline: -2vw;
  }
</style>
