<script lang="ts">
  import { Cloud } from 'lucide-svelte';
  import WeatherIcon from './WeatherIcon.svelte';
  import type { WeatherState } from '$lib/data/placeholder.js';

  let { weather }: { weather: WeatherState } = $props();

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

  let forecast = $derived(weather.attributes.forecast.slice(0, 7));
</script>

<div class="weather">
  <!-- Section label -->
  <div class="section-label">
    <Cloud size={13} strokeWidth={2} />
    <span>Weather</span>
  </div>

  <!-- Main card -->
  <div class="card">
    <!-- Top row: condition left, temp right -->
    <div class="top-row">
      <div class="left">
        <span class="cond-icon">
          <WeatherIcon condition={weather.state} size={56} strokeWidth={1.2} />
        </span>
        <div class="cond-text">
          <span class="cond-label">{condLabel(weather.state)}</span>
          <span class="cond-sub">Forecast</span>
        </div>
      </div>

      <div class="right">
        <span class="temp num">{weather.attributes.temperature}{weather.attributes.temperature_unit}</span>
        <div class="hi-lo">
          <span class="hi num">H: {weather.attributes.forecast[0]?.temperature ?? '–'}°</span>
          <span class="lo num">L: {weather.attributes.forecast[0]?.templow ?? '–'}°</span>
        </div>
      </div>
    </div>

    <!-- 7-day strip — no "today" distinction per spec -->
    <div class="forecast">
      {#each forecast as day, i}
        <div class="day">
          <span class="day-label">{dayLabel(day.datetime, i)}</span>
          <span class="day-icon">
            <WeatherIcon condition={day.condition} size={30} strokeWidth={1.4} />
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

  /* ── Section label ── */
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

  /* ── Card ── */
  .card {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 0.75rem 1.4rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* ── Top row ── */
  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .cond-icon {
    display: flex;
    align-items: center;
  }

  .cond-text {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
  }

  .cond-label {
    font-size: var(--type-h1);
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

  .temp {
    font-size: var(--type-temp);
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
    gap: 3px;
    padding: 0.3rem 0.2rem;
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

  .day-hi {
    font-size: var(--type-body);
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .day-lo {
    font-size: var(--type-body);
    font-weight: 400;
    color: var(--color-text-tertiary);
  }
</style>
