<script lang="ts">
  import { Droplets } from 'lucide-svelte';
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

<div class="strip">
  <!-- Current conditions (left ~40%) -->
  <div class="current">
    <div class="current-main">
      <span class="temp num">{weather.attributes.temperature}{weather.attributes.temperature_unit}</span>
      <span class="cond-icon">
        <WeatherIcon condition={weather.state} size={48} strokeWidth={1.3} />
      </span>
    </div>
    <p class="cond-label">{condLabel(weather.state)}</p>
    <div class="humidity">
      <Droplets size={14} strokeWidth={1.8} />
      <span class="num">{weather.attributes.humidity}%</span>
    </div>
  </div>

  <!-- 7-day forecast (right ~60%) -->
  <div class="forecast">
    {#each forecast as day, i}
      <div class="day" class:today={i === 0}>
        <span class="day-label">{dayLabel(day.datetime, i)}</span>
        <span class="day-icon">
          <WeatherIcon condition={day.condition} size={18} strokeWidth={1.5} />
        </span>
        <span class="hi num">{day.temperature}°</span>
        <span class="lo num">{day.templow}°</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .strip {
    display: flex;
    gap: 4%;
    height: 100%;
    padding: 0.4rem 0;
  }

  /* ── Left: current conditions ── */
  .current {
    flex: 0 0 38%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.2em;
  }

  .current-main {
    display: flex;
    align-items: center;
    gap: 0.3em;
    line-height: 1;
  }

  .temp {
    font-size: var(--type-temp);
    font-weight: 200;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
  }

  .cond-icon {
    color: var(--color-accent-blue);
    opacity: 0.8;
    display: flex;
    align-items: center;
  }

  .cond-label {
    font-size: var(--type-h2);
    font-weight: 300;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .humidity {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--color-text-tertiary);
    font-size: var(--type-caption);
  }

  /* ── Right: 7-day forecast ── */
  .forecast {
    flex: 1;
    display: flex;
    align-items: stretch;
    min-width: 0;
  }

  .day {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0.35rem 0;
    border-radius: 12px;
    min-width: 0;
  }

  .day.today {
    background: var(--color-surface-2);
    box-shadow: inset 0 1px 0 var(--color-highlight);
  }

  .day-icon {
    color: var(--color-accent-blue);
    opacity: 0.75;
    display: flex;
    align-items: center;
  }

  .day-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
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
</style>
