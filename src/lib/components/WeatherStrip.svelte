<script lang="ts">
  import { Cloud } from 'lucide-svelte';
  import WeatherIcon from './WeatherIcon.svelte';
  import type { WeatherState, WeatherForecastDay } from '$lib/data/placeholder.js';

  let {
    weather,
    forecast = [],
    locationName = '',
  }: {
    weather: WeatherState;
    forecast?: WeatherForecastDay[];
    locationName?: string;
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
    if (idx === 1) return 'Tmrw';
    return new Date(datetime).toLocaleDateString('en-US', { weekday: 'short' });
  }

  let activeForecast = $derived(
    (forecast.length > 0 ? forecast : (weather.attributes.forecast ?? [])).slice(0, 7)
  );
</script>

<div class="weather">
  <div class="section-label">
    <Cloud size={13} strokeWidth={2} />
    <span>Weather</span>
  </div>

  <div class="card">
    <!-- Left: today -->
    <div class="today">
      <WeatherIcon condition={weather.state} size={64} strokeWidth={1.2} />
      <span class="temp num">{weather.attributes.temperature}{weather.attributes.temperature_unit}</span>
      <span class="cond-label">{condLabel(weather.state)}</span>
      {#if locationName}
        <span class="location">{locationName}</span>
      {/if}
    </div>

    <div class="divider-v"></div>

    <!-- Right: horizontal 5-day forecast -->
    <div class="forecast-row">
      {#each activeForecast.slice(1, 6) as day, i (day.datetime)}
        <div class="day-col">
          <span class="day-name">{dayLabel(day.datetime, i + 1)}</span>
          <span class="day-icon"><WeatherIcon condition={day.condition} size={42} strokeWidth={1.4} /></span>
          <span class="day-hi num">{day.temperature}°</span>
          <span class="day-lo num">{day.templow}°</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .weather { height: 100%; display: flex; flex-direction: column; gap: 0.35rem; }

  .section-label {
    display: flex; align-items: center; gap: 5px;
    color: var(--color-text-tertiary); font-size: var(--type-label);
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0.2rem; flex-shrink: 0;
  }

  .card {
    flex: 1; min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px; border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 16px 28px;
    display: grid;
    grid-template-columns: auto 1px 1fr;
    align-items: center;
    gap: 20px;
  }

  /* ── Today (left) ── */
  .today {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding-right: 4px;
  }

  .temp {
    font-size: clamp(48px, 6vw, 78px);
    font-weight: 200; letter-spacing: -0.03em;
    color: var(--color-text-primary); line-height: 1;
  }

  .cond-label {
    font-size: clamp(15px, 1.7vw, 22px);
    font-weight: 300; color: var(--color-text-primary); text-align: center;
  }

  .location {
    font-size: var(--type-label); color: var(--color-text-tertiary);
    text-transform: uppercase; letter-spacing: 0.07em; font-weight: 500;
    text-align: center; margin-top: 2px;
  }

  /* ── Vertical divider ── */
  .divider-v { width: 1px; align-self: stretch; background: var(--color-border); }

  /* ── Horizontal 5-day forecast ── */
  .forecast-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: center;
    height: 100%;
    gap: 4px;
  }

  .day-col {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 4px 0;
  }

  .day-name {
    font-size: clamp(15px, 1.6vw, 19px); font-weight: 500;
    color: var(--color-text-secondary);
  }

  .day-icon { display: flex; align-items: center; }

  .day-hi {
    font-size: clamp(18px, 1.9vw, 24px); font-weight: 600;
    color: var(--color-text-primary);
  }

  .day-lo {
    font-size: clamp(16px, 1.7vw, 21px); font-weight: 400;
    color: var(--color-text-tertiary);
  }
</style>
