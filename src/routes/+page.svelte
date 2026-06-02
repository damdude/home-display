<script lang="ts">
  import WeatherStrip    from '$lib/components/WeatherStrip.svelte';
  import CalendarTile    from '$lib/components/CalendarTile.svelte';
  import ClimateSplit    from '$lib/components/ClimateSplit.svelte';
  import QuickShortcuts  from '$lib/components/QuickShortcuts.svelte';
  import MediaNowPlaying from '$lib/components/MediaNowPlaying.svelte';

  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }             from '$lib/stores/musicState.svelte.js';

  import {
    weatherForecastHome,
    climateLivingRoomThermostat,
    type ClimateState,
  } from '$lib/data/placeholder.js';

  // ── Entity ID constants ────────────────────────────────────────────────────
  const EID = {
    weather:     'weather.forecast_home',
    climate:     'climate.living_room_thermostat',
    humidity:    'sensor.living_room_thermostat_current_humidity',
    temperature: 'sensor.living_room_thermostat_current_temperature',
    lights:      'switch.outdoor_lights_outlet1',
  } as const;

  function entity(id: string) { return haStore.entities[id]; }

  // ── Location name ────────────────────────────────────────────────────────────
  let locationName = $derived.by(() => {
    if (haStore.locationName) return haStore.locationName;
    const w = entity(EID.weather);
    if (w?.attributes?.location) return String(w.attributes.location);
    const fn: string = w?.attributes?.friendly_name ?? '';
    if (fn) return fn.replace(/forecast/i, '').trim().replace(/^,|,$/g, '').trim();
    return '';
  });

  // ── Weather ──────────────────────────────────────────────────────────────────
  let weatherEntity = $derived(entity(EID.weather));
  let weather = $derived({
    state: weatherEntity?.state ?? weatherForecastHome.state,
    attributes: {
      temperature:      weatherEntity?.attributes?.temperature      ?? weatherForecastHome.attributes.temperature,
      temperature_unit: weatherEntity?.attributes?.temperature_unit ?? weatherForecastHome.attributes.temperature_unit,
      humidity:         weatherEntity?.attributes?.humidity         ?? weatherForecastHome.attributes.humidity,
      forecast:         weatherForecastHome.attributes.forecast,
    },
  });

  let activeForecast = $derived(
    haStore.forecast.length > 0
      ? haStore.forecast
      : weatherForecastHome.attributes.forecast
  );

  // ── Climate ──────────────────────────────────────────────────────────────────
  let climateEntity    = $derived(entity(EID.climate));
  let humidityEntity   = $derived(entity(EID.humidity));
  let tempSensorEntity = $derived(entity(EID.temperature));

  let climate = $derived<ClimateState>({
    state: (climateEntity?.state ?? climateLivingRoomThermostat.state) as ClimateState['state'],
    attributes: {
      current_temperature:
        tempSensorEntity?.state != null
          ? parseFloat(tempSensorEntity.state)
          : (climateEntity?.attributes?.current_temperature
              ?? climateLivingRoomThermostat.attributes.current_temperature),
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
    humidityEntity?.state != null ? parseFloat(humidityEntity.state) : null
  );

  function adjustSetpoint(delta: number) {
    const state = climate.state;
    if (state === 'off') return;
    if (state === 'heat' || state === 'cool') {
      const current = climate.attributes.temperature ?? climate.attributes.target_temp_high;
      callHaService('climate', 'set_temperature', { entity_id: EID.climate, temperature: current + delta });
    } else {
      if (delta > 0) {
        callHaService('climate', 'set_temperature', {
          entity_id: EID.climate,
          target_temp_low:  climate.attributes.target_temp_low,
          target_temp_high: climate.attributes.target_temp_high + delta,
        });
      } else {
        callHaService('climate', 'set_temperature', {
          entity_id: EID.climate,
          target_temp_low:  climate.attributes.target_temp_low + delta,
          target_temp_high: climate.attributes.target_temp_high,
        });
      }
    }
  }

  function setClimateMode(mode: 'heat' | 'cool' | 'heat_cool' | 'off') {
    callHaService('climate', 'set_hvac_mode', { entity_id: EID.climate, hvac_mode: mode });
  }

  // ── Outdoor lights ────────────────────────────────────────────────────────────
  let lightsOn = $derived(entity(EID.lights)?.state === 'on');
  function toggleOutdoorLights() {
    callHaService('switch', 'toggle', { entity_id: EID.lights });
  }

  // ── Media player — live from musicState resolution layer ─────────────────────
  let activePlayer = $derived(musicState.active);
</script>

<!-- Home section: weather / calendar / climate / shortcuts / media -->
<div class="home">
  <section class="zone zone-weather">
    <WeatherStrip {weather} forecast={activeForecast} locationName={locationName} />
  </section>

  <section class="zone zone-calendar">
    <CalendarTile events={haStore.calendarEvents} overflow={haStore.calendarOverflow} />
  </section>

  <section class="zone zone-climate">
    <ClimateSplit
      {climate}
      {humidity}
      onAdjustSetpoint={adjustSetpoint}
      onSetMode={setClimateMode}
    />
  </section>

  <section class="zone zone-shortcuts">
    <QuickShortcuts
      outdoorLightsOn={lightsOn}
      onToggleOutdoorLights={toggleOutdoorLights}
    />
  </section>

  <section class="zone zone-media">
    <MediaNowPlaying player={activePlayer} />
  </section>
</div>

<style>
  /* Home fills the content area; 5 zones in proportional rows */
  .home {
    height: 100%;
    display: grid;
    grid-template-rows: 18fr 11fr 15fr 10fr 16fr;
    row-gap: clamp(5px, 0.7vh, 10px);
    padding: clamp(4px, 0.5vh, 8px) 5vw clamp(4px, 0.4vh, 8px);
    overflow: hidden;
    box-sizing: border-box;
  }

  .zone {
    min-height: 0;
    overflow: hidden;
  }
</style>
