<script lang="ts">
  /**
   * Screensaver overlay — two modes:
   *   • Music mode  (player != null): artwork + title + transport controls
   *   • Clock mode  (player == null): large time + location + temperature
   *
   * Both modes use pure black background. Tap anywhere to dismiss.
   */
  import { fade }        from 'svelte/transition';
  import { cubicOut }    from 'svelte/easing';
  import { X, Play, Pause, SkipBack, SkipForward, MapPin, Thermometer, Calendar as CalendarIcon } from 'lucide-svelte';
  import ProgressBar     from './ProgressBar.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  interface CalendarEvent { summary: string; start: string; allDay: boolean; location?: string | null; }

  interface Props {
    player:         ResolvedPlayer | null;  // null = clock mode
    locationLabel:  string;
    temperature:    string | null;
    calendarEvents: CalendarEvent[];
    onClose:        () => void;
  }
  let { player, locationLabel, temperature, calendarEvents, onClose }: Props = $props();

  function formatEventTime(event: CalendarEvent): string {
    const date = new Date(event.start);
    const mo   = (date.getMonth() + 1).toString().padStart(2, '0');
    const dy   = date.getDate().toString().padStart(2, '0');
    if (event.allDay) return `${mo}/${dy}`;
    const h    = date.getHours() % 12 || 12;
    const min  = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.getHours() < 12 ? 'AM' : 'PM';
    return `${mo}/${dy} ${h}:${min} ${ampm}`;
  }

  // ── Music mode state ────────────────────────────────────────────────────────
  let isPlaying = $derived(player?.state === 'playing');

  // Show the close X only after a tap; auto-hides after 3s
  let xVisible = $state(false);
  let xTimer: ReturnType<typeof setTimeout>;

  function touchActivity() {
    xVisible = true;
    clearTimeout(xTimer);
    xTimer = setTimeout(() => { xVisible = false; }, 3_000);
  }

  // ── Transport helpers ───────────────────────────────────────────────────────
  // ALL service calls use controlId (MA-managed entity).
  // stateId is for reading metadata/state only — never for sending commands.
  function mp(service: string) {
    if (!player) return;
    callHaService('media_player', service, { entity_id: player.controlId });
  }

  // ── Clock mode state ────────────────────────────────────────────────────────
  let clockTime = $state('');
  let clockDate = $state('');

  $effect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours() % 12 || 12;
      const m = now.getMinutes().toString().padStart(2, '0');
      clockTime = `${h}:${m}`;
      clockDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month:   'long',
        day:     'numeric',
      });
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  });
</script>

{#if player}
  <!-- ── Music screensaver ─────────────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="screensaver music"
    transition:fade={{ duration: 600, easing: cubicOut }}
    onmousemove={touchActivity}
    ontouchstart={touchActivity}
    onclick={touchActivity}
  >
    <!-- Close button — top-right, fades in on interaction -->
    <button
      class="close-btn"
      class:visible={xVisible}
      onclick={(e) => { e.stopPropagation(); onClose(); }}
      aria-label="Exit screensaver"
    >
      <X size={22} strokeWidth={2} />
    </button>

    <!-- Main content — centered column -->
    <div class="main">
      <!-- Artwork -->
      <div class="artwork" class:paused={!isPlaying}>
        {#if player.media.artwork}
          <img src={player.media.artwork} alt="Album art" class="art-img" />
        {:else}
          <div class="art-placeholder"></div>
        {/if}
      </div>

      <!-- Track info -->
      <div class="track-info">
        <h1 class="title">{player.media.title ?? 'Now Playing'}</h1>
        {#if player.media.artist}
          <p class="artist">{player.media.artist}</p>
        {/if}
      </div>

      <!-- Progress bar -->
      <div class="progress-wrap">
        <ProgressBar
          position={player.media.position}
          duration={player.media.duration}
          positionUpdatedAt={player.media.positionUpdatedAt}
          playbackState={player.state}
          canSeek={player.caps.canSeek}
          large
          onSeek={(s) => callHaService('media_player', 'media_seek', { entity_id: player.controlId, seek_position: s })}
        />
      </div>

      <!-- Transport: SkipBack · Play/Pause · SkipForward -->
      <div class="transport">
        <button
          class="ctrl"
          onclick={() => mp('media_previous_track')}
          disabled={!player.caps.canPrevious}
          aria-label="Previous"
        >
          <SkipBack size={44} strokeWidth={1.5} />
        </button>
        <button
          class="ctrl play-btn"
          onclick={(e) => { e.stopPropagation(); mp(isPlaying ? 'media_pause' : 'media_play'); }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {#if isPlaying}
            <Pause size={56} strokeWidth={1.8} />
          {:else}
            <Play  size={56} strokeWidth={1.8} />
          {/if}
        </button>
        <button
          class="ctrl"
          onclick={() => mp('media_next_track')}
          disabled={!player.caps.canNext}
          aria-label="Next"
        >
          <SkipForward size={44} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  </div>

{:else}
  <!-- ── Clock screensaver ─────────────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="screensaver clock"
    transition:fade={{ duration: 600, easing: cubicOut }}
    onclick={onClose}
  >
    <div class="clock-body">

      <!-- Location + temperature pill — above the time -->
      {#if locationLabel || temperature}
        <div class="clock-meta">
          {#if locationLabel}
            <span class="meta-item">
              <MapPin size={13} strokeWidth={1.5} />
              <span>{locationLabel}</span>
            </span>
          {/if}
          {#if locationLabel && temperature}
            <span class="meta-sep">·</span>
          {/if}
          {#if temperature}
            <span class="meta-item">
              <Thermometer size={13} strokeWidth={1.5} />
              <span>{temperature}°</span>
            </span>
          {/if}
        </div>
      {/if}

      <!-- Large time -->
      <p class="clock-time">{clockTime}</p>

      <!-- Date — Wednesday, June 5 -->
      <p class="clock-date">{clockDate}</p>

      <!-- Calendar events — directly below the date -->
      {#if calendarEvents.length > 0}
        <div class="clock-calendar">
          {#each calendarEvents.slice(0, 4) as event}
            <div class="cal-item">
              <span class="cal-dot"></span>
              <div class="cal-content">
                <span class="cal-summary">{event.summary}</span>
                <span class="cal-time">{formatEventTime(event)}</span>
                {#if event.location}
                  <span class="cal-location">{event.location}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

    </div>
  </div>
{/if}

<style>
  /* ── Shared base ── */
  .screensaver {
    position: fixed; inset: 0; z-index: 200;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    background: #000000;
  }

  /* ── Music mode ── */
  .screensaver.music {
    /* tap on bg shows X — handled via onclick=touchActivity */
  }

  /* Close button — hidden until tap */
  .close-btn {
    position: absolute;
    top: clamp(16px, 2vh, 28px);
    right: clamp(16px, 2vw, 28px);
    z-index: 1;
    width: 44px; height: 44px; border-radius: 12px;
    border: none;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity 300ms ease, background 200ms;
    -webkit-tap-highlight-color: transparent;
  }
  .close-btn.visible { opacity: 1; }
  .close-btn:active   { background: rgba(255,255,255,0.18); }

  /* Main content column (music mode) */
  .main {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    align-items: center;
    gap: clamp(16px, 2vh, 28px);
    width: min(60vw, 80vh);
    padding: 0 5vw;
  }

  /* Artwork */
  .artwork {
    width: min(55vw, 50vh);
    height: min(55vw, 50vh);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 16px 60px rgba(0,0,0,0.65);
    flex-shrink: 0;
    transition: opacity 300ms ease, filter 300ms ease;
  }
  .artwork.paused { opacity: 0.8; filter: saturate(0.55); }
  .art-img         { width: 100%; height: 100%; object-fit: cover; display: block; }
  .art-placeholder { width: 100%; height: 100%; background: var(--color-surface-2); }

  /* Track info */
  .track-info {
    text-align: center; width: 100%;
    display: flex; flex-direction: column; gap: 0.2rem;
  }
  .title {
    font-size: clamp(36px, 4.5vw, 72px);
    font-weight: 700; letter-spacing: -0.025em;
    color: rgba(255,255,255,0.95);
    margin: 0; line-height: 1.1;
    overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .artist {
    font-size: clamp(20px, 2.4vw, 40px);
    font-weight: 400; color: rgba(255,255,255,0.72);
    margin: 0;
  }

  /* Progress bar */
  .progress-wrap { width: 100%; }

  /* Transport */
  .transport {
    display: flex; align-items: center; justify-content: center;
    gap: clamp(24px, 4vw, 56px);
  }
  .ctrl {
    border: none; background: none; cursor: pointer;
    color: rgba(255,255,255,0.88);
    display: flex; align-items: center; justify-content: center;
    padding: 4px; border-radius: 50%;
    transition: transform 130ms cubic-bezier(0.32,0.72,0,1), opacity 130ms;
    -webkit-tap-highlight-color: transparent;
  }
  .ctrl:disabled { opacity: 0.28; cursor: default; pointer-events: none; }
  .ctrl:not(:disabled):active { transform: scale(0.88); }
  .play-btn { padding: 6px; }

  /* ── Clock mode ── */
  .screensaver.clock {
    cursor: pointer;
  }

  /* Single centered column containing everything */
  .clock-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    user-select: none;
    text-align: center;
  }

  /* Location + temperature — sits just above the time */
  .clock-meta {
    display: flex; align-items: center; gap: 10px;
    color: rgba(255,255,255,0.38);
    font-size: clamp(14px, 1.6vw, 22px);
    font-weight: 400; letter-spacing: 0.06em;
    margin-bottom: clamp(4px, 0.8vh, 12px);
    white-space: nowrap;
  }
  .meta-item {
    display: flex; align-items: center; gap: 5px;
  }
  .meta-sep { opacity: 0.35; }

  /* The clock itself */
  .clock-time {
    font-size: clamp(100px, 19vw, 240px);
    font-weight: 200;
    letter-spacing: -0.04em;
    color: rgba(255,255,255,0.90);
    margin: 0;
    font-variant-numeric: tabular-nums;
    line-height: 0.95;
  }

  /* Date — Wednesday, June 5 */
  .clock-date {
    font-size: clamp(18px, 2.2vw, 32px);
    font-weight: 300;
    color: rgba(255,255,255,0.42);
    margin: clamp(6px, 0.8vh, 12px) 0 0;
    letter-spacing: 0.04em;
  }

  /* Calendar — immediately below the date */
  .clock-calendar {
    display: flex; flex-direction: column; gap: 10px;
    margin-top: clamp(20px, 3vh, 40px);
    min-width: min(380px, 70vw);
    max-width: 70vw;
  }

  .cal-item {
    display: flex; align-items: flex-start; gap: 12px;
  }

  .cal-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,0.35);
    flex-shrink: 0;
    margin-top: clamp(5px, 0.6vw, 7px); /* vertically aligns with first text line */
  }

  .cal-content {
    display: flex; flex-direction: column; gap: 2px;
    flex: 1; min-width: 0;
  }

  .cal-summary {
    font-size: clamp(14px, 1.5vw, 18px);
    font-weight: 500;
    color: rgba(255,255,255,0.75);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .cal-time {
    font-size: clamp(12px, 1.3vw, 16px);
    color: rgba(255,255,255,0.45);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .cal-location {
    font-size: clamp(10px, 1vw, 13px);
    color: rgba(255,255,255,0.35);
    font-weight: 400;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
</style>
