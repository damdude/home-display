<script lang="ts">
  /**
   * Screensaver overlay — two modes:
   *   • Music mode  (player != null): artwork + title + transport controls
   *   • Clock mode  (player == null): large time + location + temperature
   *
   * Both modes use pure black background. Tap anywhere to dismiss.
   */
  import { fade, fly }   from 'svelte/transition';
  import { cubicOut, expoOut } from 'svelte/easing';
  import {
    X, Play, Pause, SkipBack, SkipForward, MapPin, Thermometer,
    ShieldCheck, ShieldAlert, Shield, ShieldOff, DoorOpen, DoorClosed, Lightbulb,
  } from 'lucide-svelte';
  import ProgressBar     from './ProgressBar.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import type { PillDescriptor } from '$lib/data/placeholder.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  interface CalendarEvent { summary: string; start: string; allDay: boolean; location?: string | null; }

  interface Props {
    player:         ResolvedPlayer | null;  // null = clock mode
    locationLabel:  string;
    temperature:    string | null;
    calendarEvents: CalendarEvent[];
    pills?:         PillDescriptor[];
    notifCount?:    number;
    onClose:        () => void;
  }
  let { player, locationLabel, temperature, calendarEvents, pills = [], notifCount = 0, onClose }: Props = $props();

  // A pill reads as "active" (full brightness) when its state warrants attention.
  function pillActive(p: PillDescriptor): boolean {
    if (p.isTriggered) return true;
    return p.status === 'Open' || p.status === 'On'
      || p.status === 'Armed Home' || p.status === 'Armed Away';
  }

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
    <!-- Full-bleed artwork background -->
    {#if player.media.artwork}
      <img src={player.media.artwork} alt="" class="art-bg" class:paused={!isPlaying} />
    {:else}
      <div class="art-bg art-bg-placeholder"></div>
    {/if}

    <!-- Dark scrim so overlaid text/controls stay readable -->
    <div class="scrim"></div>

    {#if notifCount > 0}
      <div class="notif-badge">
        <span class="notif-dot"></span>
        {notifCount} notification{notifCount === 1 ? '' : 's'}
      </div>
    {/if}

    <!-- Close button — top-right, fades in on interaction -->
    <button
      class="close-btn"
      class:visible={xVisible}
      onclick={(e) => { e.stopPropagation(); onClose(); }}
      aria-label="Exit screensaver"
    >
      <X size={22} strokeWidth={2} />
    </button>

    <!-- Overlaid content — anchored to the bottom -->
    <div class="overlay">
      <div class="track-info">
        <h1 class="title">{player.media.title ?? 'Now Playing'}</h1>
        {#if player.media.artist}
          <p class="artist">{player.media.artist}</p>
        {/if}
      </div>

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
    {#if notifCount > 0}
      <div class="notif-badge">
        <span class="notif-dot"></span>
        {notifCount} notification{notifCount === 1 ? '' : 's'}
      </div>
    {/if}

    <div class="clock-body">

      <!-- Location + temperature pill — above the time -->
      {#if locationLabel || temperature}
        <div class="clock-meta" in:fly={{ y: 16, duration: 420, delay: 40, easing: expoOut }}>
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
      <p class="clock-time" in:fly={{ y: 18, duration: 460, delay: 100, easing: expoOut }}>{clockTime}</p>

      <!-- Date — Wednesday, June 5 -->
      <p class="clock-date" in:fly={{ y: 16, duration: 420, delay: 180, easing: expoOut }}>{clockDate}</p>

      <!-- Sensor pills — all statuses, black & white -->
      {#if pills.length > 0}
        <div class="ss-pills" in:fly={{ y: 14, duration: 420, delay: 260, easing: expoOut }}>
          {#each pills as pill (pill.id)}
            <div class="ss-pill" class:active={pillActive(pill)}>
              <span class="ss-pill-icon">
                {#if pill.iconId === 'shield-check'}
                  <ShieldCheck size={16} strokeWidth={2} />
                {:else if pill.iconId === 'shield-alert'}
                  <ShieldAlert size={16} strokeWidth={2} />
                {:else if pill.iconId === 'shield'}
                  <Shield size={16} strokeWidth={2} />
                {:else if pill.iconId === 'shield-off'}
                  <ShieldOff size={16} strokeWidth={2} />
                {:else if pill.iconId === 'door-open'}
                  <DoorOpen size={16} strokeWidth={2} />
                {:else if pill.iconId === 'door-closed'}
                  <DoorClosed size={16} strokeWidth={2} />
                {:else}
                  <Lightbulb size={16} strokeWidth={2} />
                {/if}
              </span>
              <span class="ss-pill-label">{pill.label}</span>
              <span class="ss-pill-status">{pill.status}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Calendar events — directly below the date -->
      {#if calendarEvents.length > 0}
        <div class="clock-calendar" in:fly={{ y: 14, duration: 420, delay: 340, easing: expoOut }}>
          {#each calendarEvents.slice(0, 4) as event (event.start + event.summary)}
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

  /* Full-bleed artwork background */
  .art-bg {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;          /* fill the screen, crop as needed */
    z-index: 0;
    transition: filter 400ms ease, opacity 400ms ease;
  }
  .art-bg.paused { filter: saturate(0.6) brightness(0.85); }
  .art-bg-placeholder { background: var(--color-surface-2); }

  /* Gradient scrim — darkens bottom for text legibility, keeps top art visible */
  .scrim {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,0.15) 0%,
      rgba(0,0,0,0.0) 28%,
      rgba(0,0,0,0.55) 70%,
      rgba(0,0,0,0.85) 100%
    );
    pointer-events: none;
  }

  /* Overlaid content anchored to the bottom of the screen */
  .overlay {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    z-index: 2;
    display: flex; flex-direction: column;
    align-items: center;
    gap: clamp(18px, 2.5vh, 32px);
    padding: 0 6vw clamp(40px, 6vh, 72px);
  }

  /* Track info */
  .track-info {
    text-align: center; width: 100%;
    display: flex; flex-direction: column; gap: 0.2rem;
  }
  .title {
    font-size: clamp(44px, 5.5vw, 88px);
    font-weight: 700; letter-spacing: -0.025em;
    color: #fff;
    margin: 0; line-height: 1.1;
    overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    text-shadow: 0 2px 12px rgba(0,0,0,0.6);
  }
  .artist {
    font-size: clamp(28px, 3.2vw, 52px);
    font-weight: 400; color: rgba(255,255,255,0.85);
    margin: 0;
    text-shadow: 0 2px 10px rgba(0,0,0,0.55);
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
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    padding: 4px; border-radius: 50%;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
    transition: transform 130ms cubic-bezier(0.32,0.72,0,1), opacity 130ms;
    -webkit-tap-highlight-color: transparent;
  }
  .ctrl:disabled { opacity: 0.28; cursor: default; pointer-events: none; }
  .ctrl:not(:disabled):active { transform: scale(0.88); }
  .play-btn { padding: 6px; }

  /* Notification badge — top-left, both screensaver modes */
  .notif-badge {
    position: absolute;
    top: clamp(16px, 2vh, 28px); left: clamp(16px, 2vw, 28px);
    z-index: 3;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 16px; border-radius: 999px;
    background: rgba(0,0,0,0.45);
    color: rgba(255,255,255,0.9);
    font-size: clamp(16px, 1.8vw, 22px); font-weight: 500;
    backdrop-filter: blur(4px);
    pointer-events: none;
  }
  .notif-dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: var(--color-accent-triggered);
    flex-shrink: 0;
  }

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
    color: rgba(255,255,255,0.45);
    font-size: clamp(20px, 2.4vw, 32px);
    font-weight: 400; letter-spacing: 0.06em;
    margin-bottom: clamp(6px, 1vh, 16px);
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
    font-size: clamp(26px, 3.2vw, 44px);
    font-weight: 300;
    color: rgba(255,255,255,0.5);
    margin: clamp(8px, 1vh, 16px) 0 0;
    letter-spacing: 0.04em;
  }

  /* Sensor pills — black & white, all sensors shown */
  .ss-pills {
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 10px;
    margin-top: clamp(20px, 3vh, 40px);
    max-width: min(760px, 88vw);
  }
  .ss-pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 14px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.03);
    white-space: nowrap;
    opacity: 0.55;                       /* inactive: dimmed */
  }
  /* Active (open / on / armed / triggered): full white, solid border */
  .ss-pill.active {
    opacity: 1;
    border-color: rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.10);
  }
  .ss-pill-icon   { display: flex; align-items: center; color: rgba(255,255,255,0.75); }
  .ss-pill-label  { font-size: clamp(15px, 1.6vw, 20px); font-weight: 500; color: rgba(255,255,255,0.9); }
  .ss-pill-status { font-size: clamp(14px, 1.5vw, 19px); font-weight: 500; color: rgba(255,255,255,0.6); }
  .ss-pill.active .ss-pill-status { color: #fff; }

  /* Calendar — immediately below the date */
  .clock-calendar {
    display: flex; flex-direction: column; gap: 16px;
    margin-top: clamp(24px, 3.5vh, 48px);
    min-width: min(480px, 80vw);
    max-width: 80vw;
  }

  .cal-item {
    display: flex; align-items: flex-start; gap: 12px;
  }

  .cal-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,0.35);
    flex-shrink: 0;
    margin-top: clamp(8px, 0.9vw, 11px);
  }

  .cal-content {
    display: flex; flex-direction: column; gap: 2px;
    flex: 1; min-width: 0;
  }

  .cal-summary {
    font-size: clamp(22px, 2.6vw, 34px);
    font-weight: 500;
    color: rgba(255,255,255,0.82);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .cal-time {
    font-size: clamp(17px, 2vw, 26px);
    color: rgba(255,255,255,0.5);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .cal-location {
    font-size: clamp(14px, 1.6vw, 20px);
    color: rgba(255,255,255,0.38);
    font-weight: 400;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
</style>
