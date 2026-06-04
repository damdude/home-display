<script lang="ts">
  import { onMount } from 'svelte';
  import { fade }    from 'svelte/transition';
  import { VideoOff, Maximize2, Minimize2 } from 'lucide-svelte';
  import type { ZoneEntity } from '$lib/stores/zonesStore.svelte.js';

  interface Props { entities: ZoneEntity[]; }
  let { entities }: Props = $props();

  const CAMERA_NAMES: Record<string, string> = {
    'camera.front_door': 'Front Door',
    'camera.driveway':   'Driveway',
    'camera.side_door':  'Side Door',
    'camera.garage':     'Garage',
    'camera.back_door':  'Back Door',
  };

  let cameras = $derived(entities.filter(e => e.entity_id.startsWith('camera.')));

  // ── Snapshot polling ──────────────────────────────────────────────────────
  let cacheKey = $state(Date.now());
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => { cacheKey = Date.now(); }, 30_000);
    return () => clearInterval(interval);
  });

  function snapSrc(entityId: string): string {
    return `/api/camera/${entityId}?t=${cacheKey}`;
  }

  // ── Fullscreen ────────────────────────────────────────────────────────────
  let fullId   = $state<string | null>(null);
  let fsKey    = $state(Date.now());
  let fsTimer: ReturnType<typeof setInterval> | null = null;

  function openFull(entityId: string) {
    fullId  = entityId;
    fsKey   = Date.now();
    if (fsTimer) clearInterval(fsTimer);
    fsTimer = setInterval(() => { fsKey = Date.now(); }, 1_000);
  }

  function closeFull() {
    fullId = null;
    if (fsTimer) { clearInterval(fsTimer); fsTimer = null; }
    cacheKey = Date.now(); // force grid refresh
  }

  function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && fullId) closeFull(); }
</script>

<svelte:window onkeydown={onKey} />

<!-- Camera grid -->
<div class="cam-grid">
  {#each cameras as cam (cam.entity_id)}
    {@const name = CAMERA_NAMES[cam.entity_id] ?? cam.name}
    <button
      class="cam-tile"
      onclick={() => openFull(cam.entity_id)}
      aria-label="View {name} fullscreen"
    >
      <img
        class="cam-img"
        src={snapSrc(cam.entity_id)}
        alt={name}
        loading="lazy"
      />
      <span class="cam-name">{name}</span>
      <span class="expand-btn" aria-hidden="true">
        <Maximize2 size={14} strokeWidth={2} />
      </span>
    </button>
  {/each}
</div>

<!-- Fullscreen overlay -->
{#if fullId}
  {@const fullName = CAMERA_NAMES[fullId] ?? fullId}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fs-scrim" transition:fade={{ duration: 200 }} onclick={closeFull}>
    <div class="fs-frame" onclick={(e) => e.stopPropagation()}>
      <img class="fs-img" src="/api/camera/{fullId}?t={fsKey}" alt={fullName} />
      <span class="fs-name">{fullName}</span>
      <button class="fs-close" onclick={closeFull} aria-label="Close fullscreen">
        <Minimize2 size={18} strokeWidth={2} />
      </button>
    </div>
  </div>
{/if}

<style>
  .cam-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .cam-tile {
    position: relative; border-radius: 12px; overflow: hidden;
    background: var(--color-surface-2); border: 1px solid var(--color-border);
    cursor: pointer; padding: 0; aspect-ratio: 16/9;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 150ms;
  }
  .cam-tile:active { opacity: 0.82; }

  .cam-img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .cam-name {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 16px 8px 6px;
    background: linear-gradient(transparent, rgba(0,0,0,0.6));
    color: #fff; font-size: clamp(11px, 0.97vw, 14px); font-weight: 600;
    pointer-events: none;
  }

  .expand-btn {
    position: absolute; top: 6px; right: 6px;
    background: rgba(0,0,0,0.42);
    color: rgba(255,255,255,0.85);
    border-radius: 6px; padding: 4px;
    display: flex; align-items: center;
    pointer-events: none;
    backdrop-filter: blur(2px);
  }

  /* Fullscreen */
  .fs-scrim {
    position: fixed; inset: 0; z-index: 150;
    background: rgba(0,0,0,0.88);
    display: flex; align-items: center; justify-content: center;
  }
  .fs-frame {
    position: relative;
    width: min(90vw, 90vh * 16/9);
    aspect-ratio: 16/9;
    border-radius: 16px; overflow: hidden; background: #000;
  }
  .fs-img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .fs-name {
    position: absolute; top: 12px; left: 14px;
    color: #fff; font-size: clamp(14px, 1.4vw, 20px); font-weight: 600;
    text-shadow: 0 1px 4px rgba(0,0,0,0.7); pointer-events: none;
  }
  .fs-close {
    position: absolute; top: 8px; right: 8px;
    width: 34px; height: 34px; border-radius: 9px;
    border: none; background: rgba(0,0,0,0.45);
    color: rgba(255,255,255,0.85); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(2px);
    -webkit-tap-highlight-color: transparent;
  }
  .fs-close:active { background: rgba(0,0,0,0.7); }
</style>
