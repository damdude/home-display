<!--
  WeatherIcon — maps an HA weather condition string to the right Lucide icon.
  Extracted as a component to avoid <svelte:component> dynamic dispatch.
-->
<script lang="ts">
  import {
    Sun, Moon, Cloud, CloudSun, CloudRain,
    CloudSnow, Wind, CloudLightning,
  } from 'lucide-svelte';

  let {
    condition,
    size        = 24,
    strokeWidth = 1.5,
  }: {
    condition:   string;
    size?:       number;
    strokeWidth?: number;
  } = $props();
</script>

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
{:else if condition === 'windy' || condition === 'windy-variant'}
  <Wind {size} {strokeWidth} />
{:else if condition === 'lightning' || condition === 'lightning-rainy'}
  <CloudLightning {size} {strokeWidth} />
{:else}
  <Cloud {size} {strokeWidth} />
{/if}
