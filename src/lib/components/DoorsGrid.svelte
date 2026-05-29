<script lang="ts">
  import DoorTile from './DoorTile.svelte';
  import type { BinarySensorState } from '$lib/data/placeholder.js';

  let {
    mainDoor,
    sideDoor,
    backPerimeter,
    frontSidePerimeter,
    pulseCounts = { mainDoor: 0, sideDoor: 0, backPerimeter: 0, frontSidePerimeter: 0 },
  }: {
    mainDoor:           BinarySensorState;
    sideDoor:           BinarySensorState;
    backPerimeter:      BinarySensorState;
    frontSidePerimeter: BinarySensorState;
    pulseCounts?: {
      mainDoor:           number;
      sideDoor:           number;
      backPerimeter:      number;
      frontSidePerimeter: number;
    };
  } = $props();
</script>

<div class="section">
  <p class="section-label">Doors &amp; Perimeter</p>
  <div class="grid">
    <DoorTile entity={mainDoor}           pulseCount={pulseCounts.mainDoor} />
    <DoorTile entity={sideDoor}           pulseCount={pulseCounts.sideDoor} />
    <DoorTile entity={backPerimeter}      pulseCount={pulseCounts.backPerimeter} />
    <DoorTile entity={frontSidePerimeter} pulseCount={pulseCounts.frontSidePerimeter} />
  </div>
</div>

<style>
  .section {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-label {
    font-size: var(--type-caption);
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0;
    padding-left: 4px;
  }

  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 0.6rem;
    min-height: 0;
  }
</style>
