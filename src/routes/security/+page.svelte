<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Shield, ShieldCheck, ShieldAlert, ShieldOff,
    VideoOff, Maximize2, Minimize2,
    ShieldX, Zap, BatteryLow, HeartPulse,
    Siren, BellRing, BellOff,
  } from 'lucide-svelte';
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';

  // ── Entity IDs ────────────────────────────────────────────────────────────────
  const ALARM_ID = 'alarm_control_panel.security_partition_1';
  const PANIC_ID = 'button.security_panic_a';
  const CHIME_ID = 'switch.security_panel_chime';

  // Diagnostic binary sensors (off = OK for battery/health; on = OK for ready/ac)
  const DIAG_IDS = {
    ready:   'binary_sensor.security_partition_1_ready',
    ac:      'binary_sensor.security_partition_1_ac_power',
    battery: 'binary_sensor.security_partition_1_panel_battery',
    health:  'binary_sensor.security_partition_1_panel_health',
  } as const;

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

  let alarmEntity    = $derived(haStore.entities[ALARM_ID]);
  let alarmState     = $derived<AlarmState>((alarmEntity?.state ?? 'unknown') as AlarmState);

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
  let isDisarmed     = $derived(alarmState === 'disarmed');

  function callAlarm(service: string) {
    callHaService('alarm_control_panel', service, { entity_id: ALARM_ID });
  }

  let chimeOn = $derived(haStore.entities[CHIME_ID]?.state === 'on');

  // ── Diagnostic sensors ─────────────────────────────────────────────────────────
  let diagReady   = $derived(haStore.entities[DIAG_IDS.ready]?.state);
  let diagAC      = $derived(haStore.entities[DIAG_IDS.ac]?.state);
  let diagBattery = $derived(haStore.entities[DIAG_IDS.battery]?.state);
  let diagHealth  = $derived(haStore.entities[DIAG_IDS.health]?.state);

  // 'on' = ready; 'off' = not ready (or unknown → treat as unknown, show nothing)
  let isReady    = $derived(diagReady   === 'on');
  let hasAC      = $derived(diagAC      === 'on');
  let batteryOK  = $derived(diagBattery === 'off'); // inverted: off = OK
  let isHealthy  = $derived(diagHealth  === 'off'); // inverted: off = healthy

  // ── Ready/not-ready message ────────────────────────────────────────────────────
  let openDoorNames = $derived(
    DOOR_IDS
      .filter(d => haStore.entities[d.entityId]?.state === 'on')
      .map(d => d.label)
  );

  let readyMessage = $derived.by<string>(() => {
    // If we haven't received the ready sensor yet, no message
    if (diagReady === undefined) return '';
    if (isReady) return 'System is ready for arming';
    // Not ready — explain why
    const count = openDoorNames.length;
    if (count === 0) return 'System not ready for arming';
    if (count === 1) return `System not ready for arming — ${openDoorNames[0]} is open`;
    if (count === 2) return `System not ready for arming — ${openDoorNames[0]} and ${openDoorNames[1]} are open`;
    return 'System not ready for arming — multiple doors or windows are open';
  });

  // ── Camera availability + grid layout ─────────────────────────────────────────

  function isCameraAvailable(entityId: string): boolean {
    const state = haStore.entities[entityId]?.state;
    return !!state && state !== 'unavailable' && state !== 'unknown';
  }

  let cameraCount = $derived(CAMERAS.length);

  // Compute CSS grid style for the camera container based on count
  function gridContainerStyle(count: number): string {
    if (count <= 1) return 'grid-template-columns: 1fr;';
    if (count === 2) return 'grid-template-columns: 1fr; grid-template-rows: 1fr 1fr;';
    if (count <= 4) return 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
    if (count === 5) return 'grid-template-columns: repeat(6, 1fr);';
    if (count === 6) return 'grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr;';
    // 7+: two-row horizontal scroll via auto-flow
    return '';
  }

  // Per-tile grid-column span override (for special layouts)
  function tileStyle(idx: number, count: number): string {
    if (count === 3 && idx === 0) return 'grid-column: 1 / -1;';
    if (count === 5) {
      return idx < 2 ? 'grid-column: span 3;' : 'grid-column: span 2;';
    }
    return '';
  }

  // ── Snapshot refresh (30s while mounted; route-aware via onMount/onDestroy) ────

  let gridCacheKey  = $state(Date.now());
  let gridInterval: ReturnType<typeof setInterval>;

  // After closing fullscreen, store the last-seen snapshot URL per camera
  // so the tile shows the most recent frame without waiting 30s.
  let tileOverrides = $state<Record<string, string>>({});

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
    // 1s refresh in fullscreen (near-live snapshot).
    // TODO Phase 3b: upgrade to HLS streaming (requires M3U8 proxy endpoint
    // to rewrite segment URLs — deferred due to proxy complexity).
    fullscreenInterval = setInterval(() => { fullscreenKey = Date.now(); }, 1_000);
  }

  function closeCamera() {
    if (fullscreenCamera) {
      // Store last-seen snapshot so the tile reflects the most recent frame
      tileOverrides = {
        ...tileOverrides,
        [fullscreenCamera]: `/api/camera/${fullscreenCamera}?t=${fullscreenKey}`,
      };
    }
    fullscreenCamera = null;
    if (fullscreenInterval) { clearInterval(fullscreenInterval); fullscreenInterval = null; }
    // Immediately refresh grid so all tiles sync up
    gridCacheKey = Date.now();
  }

  function tileSrc(entityId: string): string {
    return tileOverrides[entityId] ?? `/api/camera/${entityId}?t=${gridCacheKey}`;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && fullscreenCamera) closeCamera();
  }

  // ── Recent activity ring buffer ───────────────────────────────────────────────

  interface ActivityEvent { id: number; time: Date; label: string; detail: string; }

  let events       = $state<ActivityEvent[]>([]);
  let eventSeq     = 0;
  const prevStates = new Map<string, string>();
  const MAX_EVENTS = 10;

  function pushEvent(label: string, detail: string) {
    events = [{ id: eventSeq++, time: new Date(), label, detail }, ...events].slice(0, MAX_EVENTS);
  }

  $effect(() => {
    const ents = haStore.entities;
    const WATCHED = [{ id: ALARM_ID, label: 'Security Alarm' }, ...DOOR_IDS];
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

  // ── Diagnostic label helpers ──────────────────────────────────────────────────
  const DIAG_OK: Record<string, string> = {
    'Ready': 'Ready', 'AC Power': 'AC OK', 'Battery': 'Battery OK', 'Health': 'Healthy',
  };
  const DIAG_BAD: Record<string, string> = {
    'Ready': 'Not Ready', 'AC Power': 'On Battery', 'Battery': 'Low Battery', 'Health': 'Issue',
  };
  function diagOKLabel(label: string): string { return DIAG_OK[label] ?? 'OK'; }
  function diagBadLabel(label: string): string { return DIAG_BAD[label] ?? 'Issue'; }

  function stateDetail(entityId: string, from: string, to: string): string {
    if (entityId === ALARM_ID) return `${ALARM_LABEL[from] ?? from} → ${ALARM_LABEL[to] ?? to}`;
    return from === 'on' ? 'Opened (was closed)' : 'Closed (was open)';
  }

  function formatRelative(date: Date): string {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s <  5) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  let now = $state(Date.now());

  onMount(() => {
    // 30s polling — stops automatically when component unmounts (navigate away)
    gridInterval = setInterval(() => { gridCacheKey = Date.now(); }, 30_000);
    const tickInterval = setInterval(() => { now = Date.now(); }, 15_000);
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

  <!-- ── Camera grid (dynamic layout based on count) ───────────────────────── -->
  <div
    class="camera-grid"
    class:scroll={cameraCount >= 7}
    style={gridContainerStyle(cameraCount)}
  >
    {#each CAMERAS as cam, idx}
      {@const available = isCameraAvailable(cam.entityId)}
      <button
        class="camera-tile"
        class:unavailable={!available}
        aria-label={available ? `View ${cam.name} fullscreen` : `${cam.name} unavailable`}
        disabled={!available}
        style={tileStyle(idx, cameraCount)}
        onclick={() => openCamera(cam.entityId, cam.name)}
      >
        {#if available}
          <img class="camera-feed" src={tileSrc(cam.entityId)} alt={cam.name} />
        {:else}
          <div class="camera-unavailable">
            <VideoOff size={32} strokeWidth={1.4} />
            <span class="unavail-label">Unavailable</span>
          </div>
        {/if}

        <!-- Camera name — TOP overlay -->
        <span class="camera-name-top">{cam.name}</span>

        <!-- Expand icon — BOTTOM-RIGHT -->
        {#if available}
          <span class="expand-icon" aria-hidden="true">
            <Maximize2 size={18} strokeWidth={2} />
          </span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- ── Alarm panel — two-tile split ──────────────────────────────────────── -->
  <div class="alarm-panel">

    <!-- LEFT: status display -->
    <div class="alarm-left">
      <!-- 1. Identifying label -->
      <p class="alarm-system-label">Home Security</p>

      <!-- 2. Current state (large, colored) -->
      <p
        class="alarm-state-text"
        class:triggered={alarmTriggered}
        style:color={alarmColor}
      >
        {alarmLabel}
      </p>

      <!-- 3. Ready/not-ready message — only meaningful when disarmed -->
      {#if isDisarmed && readyMessage}
        <div class="ready-msg" class:not-ready={!isReady}>
          <p class="ready-text">{readyMessage}</p>
        </div>
      {/if}

      <!-- 4. Diagnostic pill row -->
      <div class="diag-pills">
        {#snippet diagPill(label: string, ok: boolean, visible: boolean)}
          {#if visible}
            <span class="diag-pill" class:ok class:issue={!ok}>
              <span class="diag-dot"></span>
              {label}: <span class="diag-status">{ok ? diagOKLabel(label) : diagBadLabel(label)}</span>
            </span>
          {/if}
        {/snippet}

        {@render diagPill('Ready',    isReady,    isDisarmed && diagReady !== undefined)}
        {@render diagPill('AC Power', hasAC,      diagAC      !== undefined)}
        {@render diagPill('Battery',  batteryOK,  diagBattery !== undefined)}
        {@render diagPill('Health',   isHealthy,  diagHealth  !== undefined)}
      </div>
    </div>

    <!-- RIGHT: mode buttons -->
    <div class="alarm-right">
      <div class="mode-grid">
        <button
          class="mode-btn"
          class:active={alarmState === 'disarmed'}
          style:--btn-color="var(--color-accent-safe)"
          onclick={() => callAlarm('alarm_disarm')}
        >
          <ShieldCheck size={22} strokeWidth={1.6} />
          <span>Disarm</span>
        </button>
        <button
          class="mode-btn"
          class:active={alarmState === 'armed_home'}
          style:--btn-color="var(--color-accent-triggered)"
          onclick={() => callAlarm('alarm_arm_home')}
        >
          <Shield size={22} strokeWidth={1.6} />
          <span>Arm Home</span>
        </button>
        <button
          class="mode-btn"
          class:active={alarmState === 'armed_away'}
          style:--btn-color="var(--color-accent-triggered)"
          onclick={() => callAlarm('alarm_arm_away')}
        >
          <ShieldAlert size={22} strokeWidth={1.6} />
          <span>Arm Away</span>
        </button>
        <button
          class="mode-btn"
          class:active={alarmState === 'armed_night'}
          style:--btn-color="var(--color-accent-triggered)"
          onclick={() => callAlarm('alarm_arm_night')}
        >
          <ShieldOff size={22} strokeWidth={1.6} />
          <span>Arm Night</span>
        </button>

        <!-- Panic — always red, fires immediately on tap -->
        <button
          class="mode-btn panic"
          aria-label="Trigger panic alarm"
          onclick={() => callHaService('button', 'press', { entity_id: PANIC_ID })}
        >
          <Siren size={22} strokeWidth={1.6} />
          <span>Panic</span>
        </button>

        <!-- Panel Chime toggle -->
        <button
          class="mode-btn"
          class:active={chimeOn}
          style:--btn-color="var(--color-accent-info)"
          onclick={() => callHaService('switch', 'toggle', { entity_id: CHIME_ID })}
        >
          {#if chimeOn}
            <BellRing size={22} strokeWidth={1.6} />
          {:else}
            <BellOff size={22} strokeWidth={1.6} />
          {/if}
          <span>Chime</span>
        </button>
      </div>
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
          <div class="event-row">
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
      <button class="fs-minimize" onclick={closeCamera} aria-label="Close fullscreen">
        <Minimize2 size={20} strokeWidth={2} />
      </button>
    </div>
  </div>
{/if}

<style>
  /* ── Page layout ── */
  .security-page {
    height: 100%;
    display: grid;
    grid-template-rows: auto 4.5fr 3.5fr 1.5fr;
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
    gap: 8px;
    min-height: 0;
    /* grid-template-columns injected via style prop based on count */
  }

  /* 7+ cameras: two-row horizontal scroll */
  .camera-grid.scroll {
    grid-template-rows: 1fr 1fr;
    grid-auto-flow: column;
    grid-auto-columns: clamp(200px, 30%, 400px);
    overflow-x: auto;
    overflow-y: hidden;
  }

  .camera-tile {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    cursor: pointer;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 150ms ease;
    min-height: 0;
  }

  .camera-tile:active:not(:disabled) { opacity: 0.82; }
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

  /* Camera name — TOP overlay */
  .camera-name-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 8px 10px 22px;
    background: linear-gradient(rgba(0,0,0,0.52), transparent);
    color: #fff;
    font-size: clamp(12px, 1.04vw, 15px);
    font-weight: 600;
    letter-spacing: 0.03em;
    pointer-events: none;
  }

  .camera-tile.unavailable .camera-name-top {
    background: none;
    color: var(--color-text-secondary);
    text-align: center;
    position: static;
    padding: 6px;
    margin-top: 4px;
  }

  /* Expand icon — bottom-right pill */
  .expand-icon {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.45);
    color: var(--color-accent-info);
    opacity: 0.8;
    pointer-events: none;
    backdrop-filter: blur(2px);
  }

  /* ── Alarm panel — two-tile split ── */
  .alarm-panel {
    display: grid;
    grid-template-columns: 45fr 55fr;
    gap: 8px;
    min-height: 0;
  }

  /* Left tile */
  .alarm-left {
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 0.85rem 1.2rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.3rem;
    overflow: hidden;
  }

  /* 1. "Home Security" label */
  .alarm-system-label {
    font-size: clamp(15px, 1.48vw, 22px);
    font-weight: 500;
    color: var(--color-text-primary);
    margin: 0;
    opacity: 0.9;
  }

  /* 2. State text */
  .alarm-state-text {
    font-size: clamp(32px, 3.89vw, 56px);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .alarm-state-text.triggered {
    animation: alarmPulse 1.2s ease-in-out infinite;
  }

  @keyframes alarmPulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1.0; }
  }

  /* 3. Ready message */
  .ready-msg {
    border-radius: 8px;
    padding: 0.25rem 0;
  }

  .ready-msg.not-ready {
    background: color-mix(in srgb, var(--color-accent-alert) 12%, transparent);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    margin: 0 -0.5rem;
  }

  .ready-text {
    font-size: clamp(12px, 1.18vw, 17px);
    font-weight: 400;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.3;
  }

  .ready-msg.not-ready .ready-text {
    font-size: clamp(13px, 1.25vw, 18px);
    font-weight: 500;
    color: var(--color-accent-alert);
  }

  /* 4. Diagnostic pills */
  .diag-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 0.15rem;
  }

  .diag-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    font-size: clamp(10px, 0.9vw, 13px);
    font-weight: 500;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .diag-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--color-text-tertiary);
  }

  .diag-pill.ok .diag-dot    { background: var(--color-accent-safe);      }
  .diag-pill.issue .diag-dot { background: var(--color-accent-triggered);  }

  .diag-status {
    font-weight: 600;
  }

  .diag-pill.ok    .diag-status { color: var(--color-accent-safe);     }
  .diag-pill.issue .diag-status { color: var(--color-accent-triggered); }

  /* Right tile */
  .alarm-right {
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 2×2 button grid */
  .mode-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(6px, 0.8vw, 12px);
    width: 100%;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    padding: clamp(12px, 1.2vh, 18px) 0.5em;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--btn-color) 30%, transparent);
    background: color-mix(in srgb, var(--btn-color) 10%, var(--color-surface-2));
    color: var(--color-text-secondary);
    font-size: clamp(13px, 1.25vw, 18px);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    opacity: 0.65;
    transition: background 200ms cubic-bezier(0.32,0.72,0,1),
                color     200ms cubic-bezier(0.32,0.72,0,1),
                opacity   200ms cubic-bezier(0.32,0.72,0,1),
                transform 150ms cubic-bezier(0.32,0.72,0,1);
    -webkit-tap-highlight-color: transparent;
  }

  .mode-btn.active {
    background: color-mix(in srgb, var(--btn-color) 22%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--btn-color) 50%, transparent);
    color: var(--btn-color);
    font-weight: 600;
    opacity: 1;
  }

  .mode-btn :global(svg) {
    width:  clamp(18px, 1.67vw, 24px);
    height: clamp(18px, 1.67vw, 24px);
    flex-shrink: 0;
  }

  .mode-btn:active { transform: scale(0.96); }

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

  /* Minimize icon — top-right, same pill style as expand icon */
  .fs-minimize {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: none;
    background: rgba(0, 0, 0, 0.48);
    color: var(--color-accent-info);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.85;
    backdrop-filter: blur(2px);
    transition: opacity 200ms ease, background 200ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .fs-minimize:active { background: rgba(0,0,0,0.7); opacity: 1; }
</style>
