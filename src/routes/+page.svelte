<script lang="ts">
  import WeatherStrip      from '$lib/components/WeatherStrip.svelte';
  import CalendarTile      from '$lib/components/CalendarTile.svelte';
  import ClimateSplit      from '$lib/components/ClimateSplit.svelte';
  import MediaNowPlaying   from '$lib/components/MediaNowPlaying.svelte';
  import WidgetPlaceholder from '$lib/components/dashboard/WidgetPlaceholder.svelte';

  import { page }        from '$app/stores';
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }             from '$lib/stores/musicState.svelte.js';
  import { guestState }             from '$lib/stores/guestState.svelte.js';
  import { configStore }            from '$lib/stores/configStore.svelte.js';
  import { HOME_WIDGET_REGISTRY }   from '$lib/dashboard/widgetRegistry.js';

  import {
    weatherForecastHome,
    climateLivingRoomThermostat,
    type ClimateState,
  } from '$lib/data/placeholder.js';

  // ── Entity IDs — config-driven, falling back to the original hardcoded defaults
  //    so sparse/pre-refactor configs behave exactly as before. ──────────────────
  let eid = $derived({
    weather:     configStore.home.entities.weather    || 'weather.forecast_home',
    climate:     configStore.home.entities.climate    || 'climate.living_room_thermostat',
    humidity:    configStore.home.entities.humSensor  || 'sensor.living_room_thermostat_current_humidity',
    temperature: configStore.home.entities.tempSensor || 'sensor.living_room_thermostat_current_temperature',
  });

  function entity(id: string) { return haStore.entities[id]; }

  // ── Location name ────────────────────────────────────────────────────────────
  let locationName = $derived.by(() => {
    if (haStore.locationName) return haStore.locationName;
    const w = entity(eid.weather);
    if (w?.attributes?.location) return String(w.attributes.location);
    const fn: string = w?.attributes?.friendly_name ?? '';
    if (fn) return fn.replace(/forecast/i, '').trim().replace(/^,|,$/g, '').trim();
    return '';
  });

  // ── Weather ──────────────────────────────────────────────────────────────────
  let weatherEntity = $derived(entity(eid.weather));
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
  let climateEntity    = $derived(entity(eid.climate));
  let humidityEntity   = $derived(entity(eid.humidity));
  let tempSensorEntity = $derived(entity(eid.temperature));

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
      callHaService('climate', 'set_temperature', { entity_id: eid.climate, temperature: current + delta });
    } else {
      if (delta > 0) {
        callHaService('climate', 'set_temperature', {
          entity_id: eid.climate,
          target_temp_low:  climate.attributes.target_temp_low,
          target_temp_high: climate.attributes.target_temp_high + delta,
        });
      } else {
        callHaService('climate', 'set_temperature', {
          entity_id: eid.climate,
          target_temp_low:  climate.attributes.target_temp_low + delta,
          target_temp_high: climate.attributes.target_temp_high,
        });
      }
    }
  }

  function setClimateMode(mode: 'heat' | 'cool' | 'heat_cool' | 'off') {
    callHaService('climate', 'set_hvac_mode', { entity_id: eid.climate, hvac_mode: mode });
  }

  // ── Media player — live from musicState resolution layer ─────────────────────
  let activePlayer = $derived(musicState.active);

  // ── Dynamic dashboard ────────────────────────────────────────────────────────
  // Renders from config.homeWidgets (order + selection). ?legacy=1 falls back to
  // the original hardcoded layout while the dynamic path is being verified.
  let legacy = $derived($page.url.searchParams.has('legacy'));

  // Ordered, registry-known, guest-filtered widget ids.
  let dynamicWidgets = $derived(
    configStore.home.widgets
      .filter((id) => !!HOME_WIDGET_REGISTRY[id])          // skip unknown/retired (quick_actions)
      .filter((id) => guestState.homeWidgetVisible(id))
  );

  /** A widget is "ready" when its required entities are present in HA (or it needs
      none). During boot (not yet connected) we render rather than flash a placeholder. */
  function widgetReady(id: string): boolean {
    const def = HOME_WIDGET_REGISTRY[id];
    if (!def) return false;
    const req = def.requiredEntities(configStore.home.entities);
    if (req.length === 0) return true;
    if (!haStore.connected) return true;
    return req.every((e) => e in haStore.entities);
  }

  function propsFor(id: string): Record<string, unknown> {
    switch (id) {
      case 'weather':     return { weather, forecast: activeForecast, locationName };
      case 'calendar':    return { events: haStore.calendarEvents, overflow: haStore.calendarOverflow };
      case 'climate':     return { climate, humidity, onAdjustSetpoint: adjustSetpoint, onSetMode: setClimateMode };
      case 'now_playing': return { player: activePlayer };
      default:            return {};
    }
  }
</script>

<div class="home">
  {#if legacy}
    <!-- ── Legacy hardcoded layout (fallback via ?legacy=1) ── -->
    {#if guestState.homeWidgetVisible('weather')}
      <section class="zone zone-weather">
        <WeatherStrip {weather} forecast={activeForecast} {locationName} />
      </section>
    {/if}
    {#if guestState.homeWidgetVisible('calendar')}
      <section class="zone zone-calendar">
        <CalendarTile events={haStore.calendarEvents} overflow={haStore.calendarOverflow} />
      </section>
    {/if}
    {#if guestState.homeWidgetVisible('climate')}
      <section class="zone zone-climate">
        <ClimateSplit {climate} {humidity} onAdjustSetpoint={adjustSetpoint} onSetMode={setClimateMode} />
      </section>
    {/if}
    {#if guestState.homeWidgetVisible('now_playing')}
      <section class="zone zone-media">
        <MediaNowPlaying player={activePlayer} />
      </section>
    {/if}

  {:else}
    <!-- ── Dynamic: rendered from config.homeWidgets order + selection ── -->
    {#each dynamicWidgets as id (id)}
      {@const def = HOME_WIDGET_REGISTRY[id]}
      {@const Comp = def.component}
      <section class="zone {def.sizeClass}">
        {#if widgetReady(id)}
          <Comp {...propsFor(id)} />
        {:else}
          <WidgetPlaceholder label={def.label} />
        {/if}
      </section>
    {/each}
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
