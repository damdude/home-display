<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade }          from 'svelte/transition';
  import { Minimize2, X }       from 'lucide-svelte';

  interface CameraEntry { entity_id: string; name: string; }

  interface Props {
    cameras:        CameraEntry[];
    initialCamera?: string | null;
    onClose:        () => void;
  }

  let { cameras, initialCamera = null, onClose }: Props = $props();

  // ── Snapshot refresh ───────────────────────────────────────────────────
  let gridKey = $state(Date.now());
  let fsKey   = $state(Date.now());
  let timer:  ReturnType<typeof setInterval> | undefined;
  let fsTimer: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    timer = setInterval(() => { gridKey = Date.now(); }, 30_000);
  });

  onDestroy(() => {
    clearInterval(timer);
    clearInterval(fsTimer);
  });

  // ── Fullscreen single camera ───────────────────────────────────────────
  let fullCamera = $state<CameraEntry | null>(
    initialCamera ? (cameras.find(c => c.entity_id === initialCamera) ?? null) : null
  );

  function openFull(cam: CameraEntry) {
    fullCamera = cam;
    fsKey = Date.now();
    clearInterval(fsTimer);
    fsTimer = setInterval(() => { fsKey = Date.now(); }, 1_000);
  }

  function closeFull() {
    fullCamera = null;
    clearInterval(fsTimer);
    gridKey = Date.now();
  }

  function snapSrc(entityId: string, key: number): string {
    return `/api/camera/${entityId}?t=${key}`;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (fullCamera) closeFull();
      else onClose();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- Scrim -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="scrim"
  transition:fade={{ duration: 200 }}
  onclick={onClose}
></div>

<!-- Camera panel (flies up from bottom) -->
<div
  class="panel"
  transition:fly={{ y: 320, duration: 320, easing: (t) => {
    // cubic-bezier(0.32, 0.72, 0, 1)
    const c1 = 0.32, c2 = 0.72, c3 = 0, c4 = 1;
    return t < 0 ? 0 : t > 1 ? 1 : 3*c1*t*(1-t)**2 + 3*c2*t**2*(1-t) + c4*t**3;
  }}}
>
  <!-- Panel header -->
  <div class="panel-header">
    <span class="panel-title">Cameras</span>
    <button class="close-btn" onclick={onClose} aria-label="Close">
      <X size={18} strokeWidth={2} />
    </button>
  </div>

  <!-- Grid thumbnails -->
  <div class="cam-grid">
    {#each cameras as cam (cam.entity_id)}
      <button
        class="cam-tile"
        onclick={(e) => { e.stopPropagation(); openFull(cam); }}
        aria-label="View {cam.name} fullscreen"
      >
        <img
          class="cam-img"
          src={snapSrc(cam.entity_id, gridKey)}
          alt={cam.name}
          loading="lazy"
        />
        <span class="cam-name">{cam.name}</span>
      </button>
    {/each}
  </div>
</div>

<!-- Fullscreen single camera -->
{#if fullCamera}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fs-scrim" transition:fade={{ duration: 180 }} onclick={closeFull}>
    <div class="fs-frame" onclick={(e) => e.stopPropagation()}>
      <img class="fs-img" src={snapSrc(fullCamera.entity_id, fsKey)} alt={fullCamera.name} />
      <span class="fs-name">{fullCamera.name}</span>
      <button class="fs-close" onclick={closeFull} aria-label="Close fullscreen">
        <Minimize2 size={16} strokeWidth={2} />
      </button>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 140;
    background: rgba(0,0,0,0.55);
  }

  .panel {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 145;
    background: var(--color-surface-1);
    border-radius: 24px 24px 0 0;
    border-top: 1px solid var(--color-border);
    padding: 0 0 env(safe-area-inset-bottom, 0);
    max-height: 80vh;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px 12px;
    position: sticky; top: 0;
    background: var(--color-surface-1);
    border-bottom: 1px solid var(--color-border);
    z-index: 1;
  }

  .panel-title {
    font-size: clamp(16px, 1.6vw, 22px); font-weight: 600;
    color: var(--color-text-primary);
  }

  .close-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: none; background: var(--color-surface-2);
    color: var(--color-text-secondary); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .close-btn:active { background: var(--color-surface-3, #2c2c32); }

  .cam-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 14px 16px 20px;
  }

  .cam-tile {
    position: relative; border-radius: 10px; overflow: hidden;
    background: var(--color-surface-2); border: 1px solid var(--color-border);
    cursor: pointer; padding: 0; aspect-ratio: 16/9;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 150ms;
  }
  .cam-tile:active { opacity: 0.8; }

  .cam-img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .cam-name {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 14px 8px 5px;
    background: linear-gradient(transparent, rgba(0,0,0,0.65));
    color: #fff; font-size: clamp(11px, 0.97vw, 14px); font-weight: 600;
    text-align: left;
    pointer-events: none;
  }

  /* Fullscreen single camera */
  .fs-scrim {
    position: fixed; inset: 0; z-index: 160;
    background: rgba(0,0,0,0.9);
    display: flex; align-items: center; justify-content: center;
  }

  .fs-frame {
    position: relative;
    width: min(92vw, 92vh * 16/9);
    aspect-ratio: 16/9;
    border-radius: 14px; overflow: hidden; background: #000;
  }

  .fs-img { width: 100%; height: 100%; object-fit: contain; display: block; }

  .fs-name {
    position: absolute; top: 10px; left: 12px;
    color: #fff; font-size: clamp(14px, 1.4vw, 20px); font-weight: 600;
    text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    pointer-events: none;
  }

  .fs-close {
    position: absolute; top: 8px; right: 8px;
    width: 32px; height: 32px; border-radius: 8px;
    border: none; background: rgba(0,0,0,0.5);
    color: rgba(255,255,255,0.88); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
    -webkit-tap-highlight-color: transparent;
  }
  .fs-close:active { background: rgba(0,0,0,0.75); }
</style>
