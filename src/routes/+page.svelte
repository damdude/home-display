<script lang="ts">
  import WeatherStrip    from '$lib/components/WeatherStrip.svelte';
  import CalendarTile    from '$lib/components/CalendarTile.svelte';
  import ClimateSplit    from '$lib/components/ClimateSplit.svelte';
  import MediaNowPlaying from '$lib/components/MediaNowPlaying.svelte';

  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }             from '$lib/stores/musicState.svelte.js';
  import { guestState }             from '$lib/stores/guestState.svelte.js';

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

  // ── Media player — live from musicState resolution layer ─────────────────────
  let activePlayer = $derived(musicState.active);
</script>

<!-- Home section: weather / calendar / climate / media.
     Widgets can be hidden by Guest Mode (guestState.homeWidgetVisible). -->
<div class="home">
  {#if guestState.homeWidgetVisible('weather')}
    <section class="zone zone-weather">
      <WeatherStrip {weather} forecast={activeForecast} locationName={locationName} />
    </section>
  {/if}

  {#if guestState.homeWidgetVisible('calendar')}
    <section class="zone zone-calendar">
      <CalendarTile events={haStore.calendarEvents} overflow={haStore.calendarOverflow} />
    </section>
  {/if}

  {#if guestState.homeWidgetVisible('climate')}
    <section class="zone zone-climate">
      <ClimateSplit
        {climate}
        {humidity}
        onAdjustSetpoint={adjustSetpoint}
        onSetMode={setClimateMode}
      />
    </section>
  {/if}

  {#if guestState.homeWidgetVisible('now_playing')}
    <section class="zone zone-media">
      <MediaNowPlaying player={activePlayer} />
    </section>
  {/if}
</div>

<style>
  /* height: 100% gives flex a definite container to fill.
     overflow: visible lets shell-main scroll if calendar expands past the screen.
     Calendar and media size to their content so empty tiles collapse to thin
     bars; leftover space breathes at the bottom instead of stretching a tile. */
  .home {
    height: 100%;
    overflow: visible;
    display: flex;
    flex-direction: column;
    justify-content: start;
    gap: clamp(8px, 1.2vh, 16px);
    padding: clamp(8px, 1vh, 14px) clamp(12px, 1.5vw, 20px);
    box-sizing: border-box;
  }

  .zone            { flex-shrink: 0; overflow: hidden; }
  .zone-weather    { height: 220px; }
  .zone-calendar   { flex: 0 1 auto; overflow: visible; }  /* sizes to content (~2 events or thin empty bar) */
  .zone-climate    { height: 300px; }
  .zone-media      { flex: 0 0 auto; overflow: visible; }  /* fixed 112px card (empty bar collapses via its own min-height) */
</style>
