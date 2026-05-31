<script lang="ts">
  import { Cloud } from 'lucide-svelte';
  import WeatherIcon from './WeatherIcon.svelte';
  import type { WeatherState, WeatherForecastDay } from '$lib/data/placeholder.js';

  let {
    weather,
    forecast = [],
  }: {
    weather: WeatherState;
    /**
     * 7-day daily forecast from weather.get_forecasts service call.
     * Provided separately because HA 2024.4+ removed forecast from entity attributes.
     * Falls back to weather.attributes.forecast (placeholder / legacy) when empty.
     */
    forecast?: WeatherForecastDay[];
  } = $props();

  const LABELS: Record<string, string> = {
    'sunny':           'Sunny',
    'clear-night':     'Clear',
    'partlycloudy':    'Partly Cloudy',
    'cloudy':          'Cloudy',
    'rainy':           'Rainy',
    'pouring':         'Heavy Rain',
    'snowy':           'Snowy',
    'snowy-rainy':     'Wintry Mix',
    'windy':           'Windy',
    'windy-variant':   'Windy',
    'fog':             'Foggy',
    'lightning':       'Thunderstorm',
    'lightning-rainy': 'Thunderstorm',
  };

  function condLabel(condition: string): string {
    return LABELS[condition] ?? condition.replace(/-/g, ' ');
  }

  function dayLabel(datetime: string, idx: number): string {
    if (idx === 0) return 'Today';
    if (idx === 1) return 'Tmrw';
    return new Date(datetime).toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Use server-provided forecast if available; fall back to placeholder attribute
  let activeForecast = $derived(
    (forecast.length > 0 ? forecast : (weather.attributes.forecast ?? [])).slice(0, 7)
  );
</script>

<div class="weather">
  <!-- Section label -->
  <div class="section-label">
    <Cloud size={13} strokeWidth={2} />
    <span>Weather</span>
  </div>

  <!-- Main card -->
  <div class="card">
    <!-- Top row: condition (left) / current temp (right) -->
    <div class="top-row">
      <div class="left">
        <span class="cond-icon">
          <!-- 80-96px condition icon — fills the card height proportionally -->
          <WeatherIcon condition={weather.state} size={88} strokeWidth={1.1} />
        </span>
        <div class="cond-text">
          <span class="cond-label">{condLabel(weather.state)}</span>
          <span class="cond-sub">Forecast</span>
        </div>
      </div>

      <div class="right">
        <span class="temp num">{weather.attributes.temperature}{weather.attributes.temperature_unit}</span>
        <div class="hi-lo">
          <span class="hi num">H: {activeForecast[0]?.temperature ?? '–'}°</span>
          <span class="lo num">L: {activeForecast[0]?.templow ?? '–'}°</span>
        </div>
      </div>
    </div>

    <!-- 7-day forecast strip -->
    <div class="forecast">
      {#each activeForecast as day, i}
        <div class="day">
          <span class="day-label">{dayLabel(day.datetime, i)}</span>
          <span class="day-icon">
            <!-- 56-64px — larger icons per spec, small temps intentional contrast -->
            <WeatherIcon condition={day.condition} size={52} strokeWidth={1.3} />
          </span>
          <span class="day-hi num">{day.temperature}°</span>
          <span class="day-lo num">{day.templow}°</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .weather {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--color-text-tertiary);
    font-size: var(--type-label);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 0.2rem;
  }

  .card {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 0.7rem 1.6rem 0.55rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  /* ── Top row ── */
  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    min-height: 0;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .cond-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .cond-text {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
  }

  /* Condition word: 44-48px, scales with viewport width */
  .cond-label {
    font-size: clamp(32px, 3.33vw, 48px);
    font-weight: 300;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .cond-sub {
    font-size: var(--type-label);
    font-weight: 500;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
  }

  /* Current temp: 96-104px — large, dominant number */
  .temp {
    font-size: clamp(72px, 7.22vw, 104px);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .hi-lo {
    display: flex;
    gap: 0.5rem;
  }

  .hi {
    font-size: var(--type-caption);
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .lo {
    font-size: var(--type-caption);
    font-weight: 400;
    color: var(--color-text-tertiary);
  }

  /* ── 7-day forecast strip ── */
  .forecast {
    display: flex;
    gap: 2px;
  }

  .day {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 0.25rem 0.15rem;
    border-radius: 10px;
    min-width: 0;
  }

  .day-icon {
    display: flex;
    align-items: center;
  }

  .day-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  /* Forecast temps intentionally smaller — large icons do the visual work */
  .day-hi {
    font-size: clamp(13px, 1.25vw, 18px);
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .day-lo {
    font-size: clamp(13px, 1.25vw, 18px);
    font-weight: 400;
    color: var(--color-text-tertiary);
  }
</style>
