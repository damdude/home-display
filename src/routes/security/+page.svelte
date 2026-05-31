<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Shield, ShieldCheck, ShieldAlert, ShieldOff,
    VideoOff, X,
  } from 'lucide-svelte';
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';

  // ── Entity IDs ────────────────────────────────────────────────────────────────
  const ALARM_ID = 'alarm_control_panel.security_partition_1';

  const CAMERAS: { entityId: string; name: string }[] = [
    { entityId: 'camera.front_door',  name: 'Front Door'  },
    { entityId: 'camera.driveway',    name: 'Driveway'    },
    { entityId: 'camera.side_door',   name: 'Side Door'   },
    { entityId: 'camera.garage',      name: 'Garage'      },
  ];

  const DOOR_IDS: { entityId: string; label: string }[] = [
    { entityId: 'binary_sensor.main_door',            label: 'Main Door'            },
    { entityId: 'binary_sensor.security_zone_5',      label: 'Side Door'            },
    { entityId: 'binary_sensor.back_perimeter',       label: 'Back Perimeter'       },
    { entityId: 'binary_sensor.front_side_perimeter', label: 'Front-Side Perimeter' },
  ];

  // ── Alarm state ────────────────────────────────────────────────────────────────

  type AlarmState =
    | 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night'
    | 'triggered' | 'pending' | 'arming' | 'disarming' | 'unknown';

  let alarmEntity = $derived(haStore.entities[ALARM_ID]);
  let alarmState  = $derived<AlarmState>((alarmEntity?.state ?? 'unknown') as AlarmState);

  const ALARM_LABEL: Record<string, string> = {
    disarmed:    'Disarmed',
    armed_home:  'Armed — Home',
    armed_away:  'Armed — Away',
    armed_night: 'Armed — Night',
    triggered:   'TRIGGERED',
    pending:     'Pending…',
    arming:      'Arming…',
    disarming:   'Disarming…',
    unknown:     '–',
  };

  const ALARM_COLOR: Record<string, string> = {
    disarmed:    'var(--color-accent-safe)',
    armed_home:  'var(--color-accent-triggered)',
    armed_away:  'var(--color-accent-triggered)',
    armed_night: 'var(--color-accent-triggered)',
    triggered:   'var(--color-accent-triggered)',
    pending:     'var(--color-accent-info)',
    arming:      'var(--color-accent-info)',
    disarming:   'var(--color-accent-info)',
    unknown:     'var(--color-text-tertiary)',
  };

  let alarmLabel     = $derived(ALARM_LABEL[alarmState]  ?? alarmState);
  let alarmColor     = $derived(ALARM_COLOR[alarmState]  ?? 'var(--color-text-tertiary)');
  let alarmTriggered = $derived(alarmState === 'triggered');

  function callAlarm(service: string) {
    callHaService('alarm_control_panel', service, { entity_id: ALARM_ID });
  }

  // ── Camera snapshot refresh ───────────────────────────────────────────────────

  function isCameraAvailable(entityId: string): boolean {
    const state = haStore.entities[entityId]?.state;
    return !!state && state !== 'unavailable' && state !== 'unknown';
  }

  let gridCacheKey = $state(Date.now());
  let gridInterval: ReturnType<typeof setInterval>;

  // ── Fullscreen overlay ────────────────────────────────────────────────────────

  let fullscreenCamera  = $state<string | null>(null);
  let fullscreenName    = $state('');
  let fullscreenKey     = $state(Date.now());
  let fullscreenInterval: ReturnType<typeof setInterval> | null = null;

  function openCamera(entityId: string, name: string) {
    if (!isCameraAvailable(entityId)) return;
    fullscreenCamera = entityId;
    fullscreenName   = name;
    fullscreenKey    = Date.now();
    if (fullscreenInterval) clearInterval(fullscreenInterval);
    fullscreenInterval = setInterval(() => { fullscreenKey = Date.now(); }, 2_000);
  }

  function closeCamera() {
    fullscreenCamera = null;
    if (fullscreenInterval) { clearInterval(fullscreenInterval); fullscreenInterval = null; }
  }

  // Close fullscreen on Escape key
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && fullscreenCamera) closeCamera();
  }

  // ── Recent activity ring buffer ───────────────────────────────────────────────

  interface ActivityEvent {
    id:     number;
    time:   Date;
    label:  string;
    detail: string;
  }

  let events      = $state<ActivityEvent[]>([]);
  let eventSeq    = 0;
  const prevStates = new Map<string, string>();
  const MAX_EVENTS = 10;

  function pushEvent(label: string, detail: string) {
    events = [
      { id: eventSeq++, time: new Date(), label, detail },
      ...events,
    ].slice(0, MAX_EVENTS);
  }

  // Watch security entity states for changes; push events into the ring buffer.
  // On first snapshot the prevStates map is seeded, so we only log transitions
  // that happen while the page is mounted.
  $effect(() => {
    const ents = haStore.entities;
    const WATCHED = [
      { id: ALARM_ID,                                       label: 'Security Alarm' },
      ...DOOR_IDS,
    ];
    for (const { id, label } of WATCHED) {
      const current = ents[id]?.state;
      if (current === undefined) continue;
      const prev = prevStates.get(id);
      if (prev !== undefined && prev !== current) {
        pushEvent(label, stateDetail(id, prev, current));
      }
      prevStates.set(id, current);
    }
  });

  function stateDetail(entityId: string, from: string, to: string): string {
    if (entityId === ALARM_ID) {
      return `${ALARM_LABEL[from] ?? from} → ${ALARM_LABEL[to] ?? to}`;
    }
    // Binary sensors: 'on' = open, 'off' = closed
    const fromLabel = from === 'on' ? 'Opened' : 'Closed';
    return `${fromLabel} (was ${from === 'on' ? 'closed' : 'open'})`;
  }

  function formatRelative(date: Date): string {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec <  5)  return 'just now';
    if (diffSec < 60)  return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)  return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  }

  // ── Relative time ticks (update "Xm ago" display) ───────────────────────────
  let now = $state(Date.now());
  let tickInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    gridInterval = setInterval(() => { gridCacheKey = Date.now(); }, 5_000);
    tickInterval = setInterval(() => { now = Date.now(); }, 15_000);
    return () => {
      clearInterval(gridInterval);
      clearInterval(tickInterval);
      if (fullscreenInterval) clearInterval(fullscreenInterval);
    };
  });
</script>

<svelte:window onkeydown={onKeydown} />

<div class="security-page">

  <!-- ── Section header ─────────────────────────────────────────────────────── -->
  <div class="section-header">
    <span class="section-icon"><Shield size={36} strokeWidth={1.4} /></span>
    <div class="section-titles">
      <h1 class="section-title">Security</h1>
      <p class="section-sub">Cameras and alarm controls</p>
    </div>
  </div>

  <!-- ── Camera grid ────────────────────────────────────────────────────────── -->
  <div class="camera-grid">
    {#each CAMERAS as cam}
      {@const available = isCameraAvailable(cam.entityId)}
      <button
        class="camera-tile"
        class:unavailable={!available}
        aria-label={available ? `View ${cam.name} fullscreen` : `${cam.name} unavailable`}
        disabled={!available}
        onclick={() => openCamera(cam.entityId, cam.name)}
      >
        {#if available}
          <img
            class="camera-feed"
            src="/api/camera/{cam.entityId}?t={gridCacheKey}"
            alt={cam.name}
          />
        {:else}
          <div class="camera-unavailable">
            <VideoOff size={32} strokeWidth={1.4} />
            <span class="unavail-label">Unavailable</span>
          </div>
        {/if}
        <span class="camera-name">{cam.name}</span>
      </button>
    {/each}
  </div>

  <!-- ── Alarm control panel ────────────────────────────────────────────────── -->
  <div class="alarm-panel">
    <div class="alarm-state-block">
      <!-- Icon -->
      <span class="alarm-icon" style:color={alarmColor}>
        {#if alarmState === 'disarmed'}
          <ShieldCheck size={32} strokeWidth={1.5} />
        {:else if alarmState === 'triggered'}
          <ShieldOff size={32} strokeWidth={1.5} />
        {:else}
          <ShieldAlert size={32} strokeWidth={1.5} />
        {/if}
      </span>
      <!-- State label -->
      <span
        class="alarm-label"
        class:triggered={alarmTriggered}
        style:color={alarmColor}
      >
        {alarmLabel}
      </span>
    </div>

    <!-- Mode buttons -->
    <div class="alarm-btns">
      <button
        class="alarm-btn"
        class:active={alarmState === 'disarmed'}
        style:--btn-color="var(--color-accent-safe)"
        onclick={() => callAlarm('alarm_disarm')}
      >
        Disarm
      </button>
      <button
        class="alarm-btn"
        class:active={alarmState === 'armed_home'}
        style:--btn-color="var(--color-accent-triggered)"
        onclick={() => callAlarm('alarm_arm_home')}
      >
        Arm Home
      </button>
      <button
        class="alarm-btn"
        class:active={alarmState === 'armed_away'}
        style:--btn-color="var(--color-accent-triggered)"
        onclick={() => callAlarm('alarm_arm_away')}
      >
        Arm Away
      </button>
      <button
        class="alarm-btn"
        class:active={alarmState === 'armed_night'}
        style:--btn-color="var(--color-accent-triggered)"
        onclick={() => callAlarm('alarm_arm_night')}
      >
        Arm Night
      </button>
    </div>
  </div>

  <!-- ── Recent activity ────────────────────────────────────────────────────── -->
  <div class="activity">
    <div class="activity-label">Recent Activity</div>
    {#if events.length === 0}
      <p class="no-events">No activity recorded this session</p>
    {:else}
      <div class="event-list">
        {#each events as ev (ev.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="event-row">
            <!-- Relative time re-evaluates when `now` ticks -->
            <span class="event-time">{formatRelative(ev.time)}{now && ''}</span>
            <span class="event-entity">{ev.label}</span>
            <span class="event-detail">{ev.detail}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

</div>

<!-- ── Fullscreen camera overlay ────────────────────────────────────────────── -->
{#if fullscreenCamera}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fs-backdrop" onclick={closeCamera}>
    <div class="fs-frame" onclick={(e) => e.stopPropagation()}>
      <img
        class="fs-feed"
        src="/api/camera/{fullscreenCamera}?t={fullscreenKey}"
        alt={fullscreenName}
      />
      <span class="fs-name">{fullscreenName}</span>
      <button class="fs-close" onclick={closeCamera} aria-label="Close fullscreen">
        <X size={24} strokeWidth={2} />
      </button>
    </div>
  </div>
{/if}

<style>
  /* ── Page layout ── */
  .security-page {
    height: 100%;
    display: grid;
    grid-template-rows: auto 5fr 2.5fr 1.5fr;
    gap: clamp(6px, 0.8vh, 12px);
    padding: clamp(4px, 0.5vh, 8px) 5vw clamp(6px, 0.7vh, 10px);
    overflow: hidden;
    box-sizing: border-box;
  }

  /* ── Section header ── */
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .section-icon {
    display: flex;
    align-items: center;
    color: var(--color-accent-info);
    flex-shrink: 0;
  }

  .section-titles {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
  }

  .section-title {
    font-size: clamp(28px, 2.78vw, 40px);
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .section-sub {
    font-size: var(--type-label);
    font-weight: 500;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0;
  }

  /* ── Camera grid ── */
  .camera-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 8px;
    min-height: 0;
  }

  .camera-tile {
    position: relative;
    border-radius: 18px;
    overflow: hidden;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    cursor: pointer;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 150ms ease;
    min-height: 0;
  }

  .camera-tile:active:not(:disabled) { opacity: 0.85; }
  .camera-tile.unavailable { cursor: default; }

  .camera-feed {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .camera-unavailable {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--color-text-tertiary);
    opacity: 0.45;
  }

  .unavail-label {
    font-size: clamp(11px, 0.97vw, 14px);
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  /* Camera name overlay — bottom-left */
  .camera-name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px 10px 8px;
    background: linear-gradient(transparent, rgba(0,0,0,0.55));
    color: #fff;
    font-size: clamp(12px, 1.04vw, 15px);
    font-weight: 600;
    letter-spacing: 0.03em;
    pointer-events: none;
  }

  .camera-tile.unavailable .camera-name {
    background: none;
    color: var(--color-text-secondary);
    text-align: center;
    padding: 6px;
    position: static;
  }

  /* ── Alarm panel ── */
  .alarm-panel {
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 0.7rem 1.2rem;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    min-height: 0;
  }

  .alarm-state-block {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .alarm-icon { display: flex; align-items: center; }

  .alarm-label {
    font-size: clamp(20px, 2.08vw, 30px);
    font-weight: 600;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  /* Triggered: pulsing text */
  .alarm-label.triggered {
    animation: alarmPulse 1.2s ease-in-out infinite;
  }

  @keyframes alarmPulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1.0; }
  }

  /* Mode buttons */
  .alarm-btns {
    display: flex;
    gap: clamp(6px, 1vw, 14px);
    flex: 1;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .alarm-btn {
    padding: 0.45em 1em;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--btn-color) 30%, transparent);
    background: color-mix(in srgb, var(--btn-color) 10%, var(--color-surface-2));
    color: var(--color-text-secondary);
    font-size: clamp(13px, 1.18vw, 17px);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 200ms cubic-bezier(0.32,0.72,0,1),
                color     200ms cubic-bezier(0.32,0.72,0,1),
                transform 150ms cubic-bezier(0.32,0.72,0,1);
    -webkit-tap-highlight-color: transparent;
    opacity: 0.65;
  }

  .alarm-btn.active {
    background: color-mix(in srgb, var(--btn-color) 20%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--btn-color) 50%, transparent);
    color: var(--btn-color);
    font-weight: 600;
    opacity: 1;
  }

  .alarm-btn:active { transform: scale(0.95); }

  /* ── Recent activity ── */
  .activity {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
    overflow: hidden;
  }

  .activity-label {
    font-size: var(--type-label);
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }

  .no-events {
    font-size: clamp(13px, 1.04vw, 15px);
    color: var(--color-text-tertiary);
    opacity: 0.55;
    margin: 0;
    padding: 0.3rem 0;
  }

  .event-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    overflow: hidden;
  }

  .event-row {
    display: grid;
    grid-template-columns: 5em 1fr 1fr;
    gap: 0.5em;
    align-items: baseline;
    padding: 0.15rem 0;
    border-bottom: 1px solid var(--color-border);
    opacity: 0.85;
  }

  .event-time {
    font-size: clamp(11px, 0.9vw, 13px);
    color: var(--color-text-tertiary);
    font-weight: 500;
    font-feature-settings: 'tnum' 1;
    white-space: nowrap;
  }

  .event-entity {
    font-size: clamp(12px, 0.97vw, 14px);
    color: var(--color-text-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-detail {
    font-size: clamp(12px, 0.97vw, 14px);
    color: var(--color-text-secondary);
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Fullscreen overlay ── */
  .fs-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.88);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fs-frame {
    position: relative;
    width: min(90vw, 90vh * 16/9);
    aspect-ratio: 16 / 9;
    border-radius: 20px;
    overflow: hidden;
    background: #000;
  }

  .fs-feed {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .fs-name {
    position: absolute;
    top: 14px;
    left: 18px;
    color: #fff;
    font-size: clamp(16px, 1.67vw, 24px);
    font-weight: 600;
    letter-spacing: 0.02em;
    text-shadow: 0 1px 6px rgba(0,0,0,0.7);
    pointer-events: none;
  }

  .fs-close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(0,0,0,0.5);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 200ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .fs-close:active { background: rgba(0,0,0,0.75); }
</style>
