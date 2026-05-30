<!--
  WeatherIcon — maps an HA weather condition string to the right Lucide icon,
  and applies the per-condition color from tokens.raw.weather automatically.

  Pass color="" to suppress the weather color (uses currentColor instead).
-->
<script lang="ts">
  import {
    Sun, Moon, Cloud, CloudSun, CloudRain,
    CloudSnow, Wind, CloudLightning, CloudFog,
  } from 'lucide-svelte';
  import { raw } from '$lib/design/tokens.js';

  let {
    condition,
    size        = 24,
    strokeWidth = 1.5,
    color,
  }: {
    condition:    string;
    size?:        number;
    strokeWidth?: number;
    /** Override color. Pass empty string to use currentColor. Defaults to per-condition palette. */
    color?:       string;
  } = $props();

  // Map each HA condition to its display color
  const COLOR_MAP: Record<string, string> = {
    'sunny':           raw.weather.sunny,
    'clear-night':     raw.weather.night,
    'partlycloudy':    raw.weather.partlyCloudy,
    'cloudy':          raw.weather.cloudy,
    'rainy':           raw.weather.rainy,
    'pouring':         raw.weather.rainy,
    'snowy':           raw.weather.snowy,
    'snowy-rainy':     raw.weather.snowy,
    'fog':             raw.weather.fog,
    'windy':           raw.weather.cloudy,
    'windy-variant':   raw.weather.cloudy,
    'lightning':       raw.weather.rainy,
    'lightning-rainy': raw.weather.rainy,
  };

  let iconColor = $derived(
    color !== undefined ? color : (COLOR_MAP[condition] ?? raw.weather.cloudy)
  );
</script>

<span style:color={iconColor} style:display="contents">
  {#if condition === 'sunny'}
    <Sun {size} {strokeWidth} />
  {:else if condition === 'clear-night'}
    <Moon {size} {strokeWidth} />
  {:else if condition === 'partlycloudy'}
    <CloudSun {size} {strokeWidth} />
  {:else if condition === 'cloudy'}
    <Cloud {size} {strokeWidth} />
  {:else if condition === 'rainy' || condition === 'pouring'}
    <CloudRain {size} {strokeWidth} />
  {:else if condition === 'snowy' || condition === 'snowy-rainy'}
    <CloudSnow {size} {strokeWidth} />
  {:else if condition === 'fog'}
    <CloudFog {size} {strokeWidth} />
  {:else if condition === 'windy' || condition === 'windy-variant'}
    <Wind {size} {strokeWidth} />
  {:else if condition === 'lightning' || condition === 'lightning-rainy'}
    <CloudLightning {size} {strokeWidth} />
  {:else}
    <Cloud {size} {strokeWidth} />
  {/if}
</span>
