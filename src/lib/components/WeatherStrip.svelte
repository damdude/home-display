<script lang="ts">
  import {
    Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow,
    Wind, CloudLightning, Droplets,
  } from 'lucide-svelte';
  import type { SvelteComponent } from 'svelte';
  import type { WeatherState } from '$lib/data/placeholder.js';

  let { weather }: { weather: WeatherState } = $props();

  // Map HA condition strings → lucide icon components
  type Icon = typeof SvelteComponent<Record<string, unknown>>;
  const ICONS: Record<string, Icon> = {
    'sunny':          Sun           as unknown as Icon,
    'clear-night':    Moon          as unknown as Icon,
    'partlycloudy':   CloudSun      as unknown as Icon,
    'cloudy':         Cloud         as unknown as Icon,
    'rainy':          CloudRain     as unknown as Icon,
    'pouring':        CloudRain     as unknown as Icon,
    'snowy':          CloudSnow     as unknown as Icon,
    'snowy-rainy':    CloudSnow     as unknown as Icon,
    'windy':          Wind          as unknown as Icon,
    'windy-variant':  Wind          as unknown as Icon,
    'lightning':      CloudLightning as unknown as Icon,
    'lightning-rainy':CloudLightning as unknown as Icon,
  };

  const LABELS: Record<string, string> = {
    'sunny':          'Sunny',
    'clear-night':    'Clear',
    'partlycloudy':   'Partly Cloudy',
    'cloudy':         'Cloudy',
    'rainy':          'Rainy',
    'pouring':        'Heavy Rain',
    'snowy':          'Snowy',
    'snowy-rainy':    'Wintry Mix',
    'windy':          'Windy',
    'windy-variant':  'Windy',
    'lightning':      'Thunderstorm',
    'lightning-rainy':'Thunderstorm',
  };

  function icon(condition: string): Icon {
    return ICONS[condition] ?? (Cloud as unknown as Icon);
  }
  function label(condition: string): string {
    return LABELS[condition] ?? condition.replace(/-/g, ' ');
  }
  function dayLabel(datetime: string, idx: number): string {
    if (idx === 0) return 'Today';
    if (idx === 1) return 'Tmrw';
    return new Date(datetime).toLocaleDateString('en-US', { weekday: 'short' });
  }

  let CurrentIcon = $derived(icon(weather.state));
  let forecast    = $derived(weather.attributes.forecast.slice(0, 7));
</script>

<div class="strip">
  <!-- Current conditions (left half) -->
  <div class="current">
    <div class="current-main">
      <span class="temp num">{weather.attributes.temperature}{weather.attributes.temperature_unit}</span>
      <svelte:component this={CurrentIcon} size={48} strokeWidth={1.3} class="cond-icon" />
    </div>
    <p class="cond-label">{label(weather.state)}</p>
    <div class="humidity">
      <Droplets size={14} strokeWidth={1.8} />
      <span class="num">{weather.attributes.humidity}%</span>
    </div>
  </div>

  <!-- 7-day forecast (right half) -->
  <div class="forecast">
    {#each forecast as day, i}
      <div class="day">
        <span class="day-label">{dayLabel(day.datetime, i)}</span>
        <svelte:component this={icon(day.condition)} size={18} strokeWidth={1.5} />
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
    padding: 0.6rem 0;
  }

  /* ── Left: current conditions ── */
  .current {
    flex: 0 0 40%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25em;
  }

  .current-main {
    display: flex;
    align-items: center;
    gap: 0.3em;
  }

  .temp {
    font-size: var(--type-temp);
    font-weight: 200;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
    line-height: 1;
  }

  :global(.cond-icon) {
    color: var(--color-accent-blue);
    opacity: 0.8;
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

  /* ── Right: forecast ── */
  .forecast {
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 0;
    overflow: hidden;
  }

  .day {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0.4rem 0;
    border-radius: 14px;
    transition: background 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .day:first-child {
    background: var(--color-surface-2);
    box-shadow: inset 0 1px 0 var(--color-highlight);
  }

  .day-label {
    font-size: var(--type-caption);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 10px;
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
