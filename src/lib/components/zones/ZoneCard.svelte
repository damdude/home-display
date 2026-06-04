<script lang="ts">
  import { goto }            from '$app/navigation';
  import { slide }           from 'svelte/transition';
  import {
    Sofa, Baby, Trees, Shield, Car, UtensilsCrossed, Bed, Droplets,
    HelpCircle, LayoutGrid, Thermometer, Speaker, Tv2, Lightbulb,
    Camera, DoorOpen, DoorClosed, ShieldCheck, ShieldAlert,
  } from 'lucide-svelte';
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }              from '$lib/stores/musicState.svelte.js';
  import CameraOverlay               from './CameraOverlay.svelte';
  import type { ZoneData }           from '$lib/stores/zonesStore.svelte.js';

  interface Props { zone: ZoneData; }
  let { zone }: Props = $props();

  // ── Icon / display-name maps ──────────────────────────────────────────────
  const ZONE_ICONS: Record<string, typeof Sofa> = {
    living_room:     Sofa,
    kids_room:       Baby,
    outdoor:         Trees,
    home:            Shield,
    garage:          Car,
    kitchen:         UtensilsCrossed,
    master_room:     Bed,
    master_bathroom: Droplets,
    guest_room:      Bed,
    guest_bathroom:  Droplets,
    powder_room:     Droplets,
    __unassigned__:  HelpCircle,
  };

  const ZONE_NAMES: Record<string, string> = {
    living_room:     'Living Room',
    kids_room:       'Kids Room',
    outdoor:         'Outdoor',
    home:            'Security',
    garage:          'Garage',
    kitchen:         'Kitchen',
    master_room:     'Master Room',
    master_bathroom: 'Master Bath',
    guest_room:      'Guest Room',
    guest_bathroom:  'Guest Bath',
    powder_room:     'Powder Room',
    __unassigned__:  'Other Devices',
  };

  let ZoneIcon = $derived(ZONE_ICONS[zone.areaId] ?? LayoutGrid);
  let zoneName = $derived(ZONE_NAMES[zone.areaId] ?? zone.name);

  // ── Entity filtering ─────────────────────────────────────────────────────
  const HIDE_IDS = new Set([
    'light.outdoor_lights_mss510_69bb_outlet1',
    'media_player.nritya_kala_kendra',
    'media_player.bbox_2',
    'media_player.bbox_3',
    'media_player.music_assistant',
    'media_player.tmacbook',
  ]);
  const HIDE_MEDIA_SUFFIX = /_3$/;

  let visible = $derived(zone.entities.filter(e =>
    !HIDE_IDS.has(e.entity_id) &&
    !(e.domain === 'media_player' && HIDE_MEDIA_SUFFIX.test(e.entity_id))
  ));

  let climateEnts = $derived(visible.filter(e => e.domain === 'climate'));
  let mediaEnts   = $derived(visible.filter(e => e.domain === 'media_player'));
  let lightEnts   = $derived(visible.filter(e => e.domain === 'switch' || e.domain === 'light'));
  let cameraEnts  = $derived(visible.filter(e => e.domain === 'camera'));
  let alarmEnts   = $derived(visible.filter(e => e.domain === 'alarm_control_panel'));
  let sensorEnts  = $derived(visible.filter(e => e.domain === 'binary_sensor'));

  let hasChips = $derived(
    climateEnts.length + mediaEnts.length + lightEnts.length +
    cameraEnts.length + alarmEnts.length + sensorEnts.length > 0
  );

  // ── Climate inline expand ─────────────────────────────────────────────────
  let expandedClimate = $state<string | null>(null);

  function toggleClimate(entityId: string) {
    expandedClimate = expandedClimate === entityId ? null : entityId;
  }

  const CLIMATE_TEMP_SENSOR = 'sensor.living_room_thermostat_current_temperature';
  const CLIMATE_HUM_SENSOR  = 'sensor.living_room_thermostat_current_humidity';

  const MODE_LABELS: Record<string, string> = {
    heat: 'Heat', cool: 'Cool', heat_cool: 'Auto', auto: 'Auto', off: 'Off', dry: 'Dry', fan_only: 'Fan',
  };
  const MODE_COLORS: Record<string, string> = {
    heat:      'var(--color-accent-alert)',
    cool:      'var(--color-accent-info)',
    heat_cool: 'var(--color-accent-safe)',
    auto:      'var(--color-accent-safe)',
    off:       'var(--color-text-tertiary)',
  };
  const CLIMATE_MODES = ['heat', 'cool', 'heat_cool', 'off'];

  function climateChipColor(mode: string): string {
    return MODE_COLORS[mode] ?? 'var(--color-text-tertiary)';
  }

  function climateLabel(entityId: string): string {
    const ent  = haStore.entities[entityId];
    const temp = haStore.entities[CLIMATE_TEMP_SENSOR];
    const t    = temp?.state != null ? `${Math.round(parseFloat(temp.state))}°` : '—°';
    const mode = ent?.state ?? 'off';
    return `${t} · ${MODE_LABELS[mode] ?? mode}`;
  }

  function adjustTemp(entityId: string, delta: number) {
    const ent  = haStore.entities[entityId];
    const mode = ent?.state ?? 'off';
    const a    = ent?.attributes ?? {};
    const cur  = (mode === 'heat_cool' || mode === 'auto')
      ? ((a.target_temp_high ?? a.temperature) as number | null)
      : (a.temperature as number | null);
    if (cur == null) return;
    callHaService('climate', 'set_temperature', { entity_id: entityId, temperature: cur + delta });
  }

  function setMode(entityId: string, mode: string) {
    callHaService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: mode });
  }

  // ── Media helpers ─────────────────────────────────────────────────────────
  const MEDIA_NAMES: Record<string, string> = {
    'media_player.maindoor_speaker_2': 'Maindoor Speaker',
    'media_player.maindoor_speaker':   'Maindoor Speaker',
    'media_player.second_speaker_2':   'Second Speaker',
    'media_player.second_speaker':     'Second Speaker',
    'media_player.bbox':               'Apple TV',
  };

  function mediaName(entityId: string): string {
    return MEDIA_NAMES[entityId]
      ?? entityId.replace('media_player.', '').replace(/_/g, ' ')
           .replace(/\b\w/g, c => c.toUpperCase());
  }

  function mediaLabel(entityId: string): string {
    const ent = haStore.entities[entityId];
    if (!ent) return 'Idle';
    const title  = ent.attributes?.media_title  as string | undefined;
    const artist = ent.attributes?.media_artist as string | undefined;
    if (ent.state === 'playing' && title) {
      return artist ? `${title} — ${artist}` : title;
    }
    return ent.state === 'paused' ? 'Paused' : ent.state === 'off' ? 'Off' : 'Idle';
  }

  function isAppleTV(entityId: string): boolean {
    return entityId.includes('bbox');
  }

  function tapMedia(entityId: string) {
    musicState.setActive(entityId);
    void goto('/music');
  }

  // ── Light helpers ─────────────────────────────────────────────────────────
  const LIGHT_LABELS: Record<string, string> = {
    'switch.outdoor_lights_outlet1': 'Outdoor Lights',
  };

  function lightLabel(entityId: string): string {
    return LIGHT_LABELS[entityId]
      ?? entityId.replace(/^(switch|light)\./, '').replace(/_/g, ' ')
           .replace(/\b\w/g, c => c.toUpperCase());
  }

  function toggleLight(entityId: string) {
    const domain = entityId.split('.')[0];
    const on     = haStore.entities[entityId]?.state === 'on';
    callHaService(domain, on ? 'turn_off' : 'turn_on', { entity_id: entityId });
  }

  // ── Camera overlay ────────────────────────────────────────────────────────
  const CAMERA_NAMES: Record<string, string> = {
    'camera.front_door': 'Front Door',
    'camera.driveway':   'Driveway',
    'camera.side_door':  'Side Door',
    'camera.garage':     'Garage',
    'camera.back_door':  'Back Door',
  };

  let cameraOverlayOpen = $state(false);
  let selectedCamera    = $state<string | null>(null);

  let cameraList = $derived(
    cameraEnts.map(e => ({ entity_id: e.entity_id, name: CAMERA_NAMES[e.entity_id] ?? e.name }))
  );

  function tapCamera(entityId: string) {
    if (cameraEnts.length > 2) {
      cameraOverlayOpen = true;
    } else {
      selectedCamera    = entityId;
      cameraOverlayOpen = true;
    }
  }

  function tapCameraCount() { cameraOverlayOpen = true; }

  // ── Alarm helpers ─────────────────────────────────────────────────────────
  const ALARM_ID = 'alarm_control_panel.security_partition_1';

  const ALARM_LABELS: Record<string, string> = {
    disarmed:   'Disarmed',
    armed_home: 'Armed Home',
    armed_away: 'Armed Away',
    triggered:  'TRIGGERED',
    pending:    'Pending',
    arming:     'Arming…',
    disarming:  'Disarming…',
  };

  function alarmColor(state: string): string {
    if (state === 'disarmed')   return 'var(--color-accent-safe)';
    if (state === 'triggered')  return 'var(--color-accent-triggered)';
    if (state.startsWith('arm'))return 'var(--color-accent-alert)';
    return 'var(--color-text-tertiary)';
  }

  // ── Sensor helpers ────────────────────────────────────────────────────────
  function isDoorOpen(entityId: string): boolean {
    return haStore.entities[entityId]?.state === 'on';
  }

  // ── Summary pills ─────────────────────────────────────────────────────────
  interface SummaryPill { label: string; color: string; }

  let summaryPills = $derived.by((): SummaryPill[] => {
    const pills: SummaryPill[] = [];

    if (zone.areaId === 'living_room') {
      const temp = haStore.entities[CLIMATE_TEMP_SENSOR];
      const clim = haStore.entities['climate.living_room_thermostat'];
      if (temp) {
        const mode  = clim?.state ?? 'off';
        pills.push({ label: `${Math.round(parseFloat(temp.state))}°`, color: climateChipColor(mode) });
      }
      const med = haStore.entities['media_player.maindoor_speaker_2'];
      if (med) {
        const playing = med.state === 'playing';
        const title   = med.attributes?.media_title as string | undefined;
        pills.push({
          label: playing && title ? title : (playing ? 'Playing' : 'Idle'),
          color: playing ? 'var(--color-accent-music)' : 'var(--color-text-tertiary)',
        });
      }
    } else if (zone.areaId === 'kids_room') {
      const med = haStore.entities['media_player.second_speaker_2'];
      if (med) {
        const playing = med.state === 'playing';
        const title   = med.attributes?.media_title as string | undefined;
        pills.push({
          label: playing && title ? title : (playing ? 'Playing' : 'Idle'),
          color: playing ? 'var(--color-accent-music)' : 'var(--color-text-tertiary)',
        });
      }
    } else if (zone.areaId === 'outdoor') {
      const sw = haStore.entities['switch.outdoor_lights_outlet1'];
      const on = sw?.state === 'on';
      pills.push({ label: `Lights ${on ? 'On' : 'Off'}`, color: on ? 'var(--color-accent-safe)' : 'var(--color-text-tertiary)' });
      if (cameraEnts.length > 0) {
        pills.push({ label: `${cameraEnts.length} cams`, color: 'var(--color-text-tertiary)' });
      }
    } else if (zone.areaId === 'home') {
      const alarm = haStore.entities[ALARM_ID];
      const state = alarm?.state ?? 'unknown';
      pills.push({ label: ALARM_LABELS[state] ?? state, color: alarmColor(state) });
    } else if (zone.areaId === '__unassigned__') {
      const n = visible.length;
      pills.push({ label: `${n} device${n !== 1 ? 's' : ''}`, color: 'var(--color-text-tertiary)' });
    }

    return pills;
  });
</script>

<!-- Camera overlay (fixed, outside card layout) -->
{#if cameraOverlayOpen}
  <CameraOverlay
    cameras={cameraList}
    initialCamera={selectedCamera}
    onClose={() => { cameraOverlayOpen = false; selectedCamera = null; }}
  />
{/if}

<div class="zone-card">
  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <div class="card-header">
    <div class="title-row">
      <span class="zone-icon"><ZoneIcon size={18} strokeWidth={1.6} /></span>
      <span class="zone-name">{zoneName}</span>
    </div>
    {#if summaryPills.length > 0}
      <div class="pill-row">
        {#each summaryPills as pill}
          <span class="summary-pill" style:color={pill.color}>{pill.label}</span>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ── Chip rows ──────────────────────────────────────────────────────── -->
  {#if hasChips}
    <div class="chip-body">

      <!-- Climate chips -->
      {#if climateEnts.length > 0}
        <div class="chip-row">
          {#each climateEnts as ent (ent.entity_id)}
            {@const mode    = haStore.entities[ent.entity_id]?.state ?? 'off'}
            {@const chipCol = climateChipColor(mode)}
            <button
              class="chip"
              class:on={mode !== 'off'}
              style:--chip-accent={chipCol}
              onclick={() => toggleClimate(ent.entity_id)}
              aria-pressed={expandedClimate === ent.entity_id}
            >
              <Thermometer size={16} strokeWidth={1.8} style="color: {chipCol}" />
              <span>{climateLabel(ent.entity_id)}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Media chips -->
      {#if mediaEnts.length > 0}
        <div class="chip-row">
          {#each mediaEnts as ent (ent.entity_id)}
            {@const state   = haStore.entities[ent.entity_id]?.state ?? 'off'}
            {@const playing = state === 'playing'}
            <button
              class="chip"
              class:on={playing}
              onclick={() => tapMedia(ent.entity_id)}
            >
              {#if isAppleTV(ent.entity_id)}
                <Tv2 size={16} strokeWidth={1.8} />
              {:else}
                <Speaker size={16} strokeWidth={1.8} />
              {/if}
              <span class="chip-label">{mediaName(ent.entity_id)}</span>
              <span class="chip-sub">·</span>
              <span class="chip-sub">{mediaLabel(ent.entity_id)}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Light / switch chips -->
      {#if lightEnts.length > 0}
        <div class="chip-row">
          {#each lightEnts as ent (ent.entity_id)}
            {@const on = haStore.entities[ent.entity_id]?.state === 'on'}
            <button
              class="chip"
              class:on
              onclick={() => toggleLight(ent.entity_id)}
            >
              <Lightbulb size={16} strokeWidth={1.8}
                style="color: {on ? 'var(--color-accent-light)' : 'inherit'}" />
              <span>{lightLabel(ent.entity_id)}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Camera chips -->
      {#if cameraEnts.length > 0}
        <div class="chip-row">
          {#if cameraEnts.length > 2}
            <button class="chip" onclick={tapCameraCount}>
              <Camera size={16} strokeWidth={1.8} />
              <span>{cameraEnts.length} cameras</span>
            </button>
          {:else}
            {#each cameraEnts as cam (cam.entity_id)}
              <button class="chip" onclick={() => tapCamera(cam.entity_id)}>
                <Camera size={16} strokeWidth={1.8} />
                <span>{CAMERA_NAMES[cam.entity_id] ?? cam.name}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}

      <!-- Alarm / security chip -->
      {#if alarmEnts.length > 0}
        {@const alarmState = haStore.entities[ALARM_ID]?.state ?? 'unknown'}
        {@const aColor = alarmColor(alarmState)}
        <div class="chip-row">
          <button
            class="chip"
            style:--chip-accent={aColor}
            onclick={() => goto('/security')}
          >
            {#if alarmState === 'disarmed'}
              <ShieldCheck size={16} strokeWidth={1.8} style="color: {aColor}" />
            {:else if alarmState === 'triggered'}
              <ShieldAlert size={16} strokeWidth={1.8} style="color: {aColor}" />
            {:else}
              <Shield size={16} strokeWidth={1.8} style="color: {aColor}" />
            {/if}
            <span style:color={aColor}>{ALARM_LABELS[alarmState] ?? alarmState}</span>
          </button>
        </div>
      {/if}

      <!-- Binary sensor chips -->
      {#if sensorEnts.length > 0}
        <div class="chip-row">
          {#each sensorEnts as sen (sen.entity_id)}
            {@const open = isDoorOpen(sen.entity_id)}
            <div class="chip sensor-chip">
              {#if open}
                <DoorOpen size={16} strokeWidth={1.8}
                  style="color: var(--color-accent-alert)" />
              {:else}
                <DoorClosed size={16} strokeWidth={1.8}
                  style="color: var(--color-text-tertiary)" />
              {/if}
              <span>{sen.name}</span>
              <span class="chip-sub">{open ? 'Open' : 'Closed'}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Climate inline expand -->
      {#if expandedClimate !== null}
        {@const clEnt   = haStore.entities[expandedClimate]}
        {@const clMode  = clEnt?.state ?? 'off'}
        {@const clAttrs = clEnt?.attributes ?? {}}
        {@const setpt   = (clMode === 'heat_cool' || clMode === 'auto')
          ? ((clAttrs.target_temp_high ?? clAttrs.temperature) as number | null)
          : (clAttrs.temperature as number | null)}
        {@const curTemp = haStore.entities[CLIMATE_TEMP_SENSOR]}
        {@const curHum  = haStore.entities[CLIMATE_HUM_SENSOR]}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="climate-expand"
          transition:slide={{ duration: 220 }}
          onclick|stopPropagation
        >
          <div class="cl-top-row">
            <span class="cl-temp">
              {curTemp ? `${Math.round(parseFloat(curTemp.state))}°` : '—°'}
            </span>
            {#if curHum}
              <span class="cl-badge">{Math.round(parseFloat(curHum.state))}% RH</span>
            {/if}
          </div>

          {#if clMode !== 'off'}
            <div class="cl-setpt-row">
              <button class="cl-adj" onclick={() => adjustTemp(expandedClimate!, -1)} aria-label="Decrease">−</button>
              <span class="cl-setpt">{setpt != null ? `${Math.round(setpt)}°` : '—°'}</span>
              <button class="cl-adj" onclick={() => adjustTemp(expandedClimate!, +1)} aria-label="Increase">+</button>
            </div>
          {/if}

          <div class="cl-modes">
            {#each CLIMATE_MODES as m}
              {@const mc = MODE_COLORS[m] ?? 'var(--color-text-tertiary)'}
              <button
                class="cl-mode"
                class:active={clMode === m || (m === 'heat_cool' && clMode === 'auto')}
                style:--mc={mc}
                onclick={() => setMode(expandedClimate!, m)}
              >{MODE_LABELS[m]}</button>
            {/each}
          </div>
        </div>
      {/if}

    </div>
  {/if}
</div>

<style>
  .zone-card {
    background: var(--color-surface-1);
    border-radius: 20px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    overflow: hidden;
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: clamp(12px, 1.4vh, 18px) clamp(14px, 1.6vw, 20px);
    flex-wrap: wrap;
  }

  .title-row {
    display: flex; align-items: center; gap: 8px;
  }

  .zone-icon {
    color: var(--color-text-secondary); opacity: 0.75;
    display: flex; align-items: center; flex-shrink: 0;
  }

  .zone-name {
    font-size: clamp(16px, 1.6vw, 22px);
    font-weight: 600;
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .pill-row { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }

  .summary-pill {
    font-size: 11px; font-weight: 500;
    padding: 2px 8px; border-radius: 999px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    white-space: nowrap;
    max-width: 130px; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── Chip body ────────────────────────────────────────────────────────── */
  .chip-body {
    display: flex; flex-direction: column; gap: 6px;
    padding: 0 clamp(14px, 1.6vw, 20px) clamp(12px, 1.4vh, 18px);
  }

  .chip-row {
    display: flex; flex-wrap: wrap; gap: 6px;
  }

  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px 5px 8px;
    border-radius: 999px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    font-size: clamp(12px, 1.1vw, 15px);
    font-weight: 500;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chip:active { background: var(--color-surface-3, #2c2c32); }
  .chip.on {
    color: var(--color-text-primary);
    border-color: color-mix(in srgb, var(--color-accent-safe) 40%, transparent);
  }

  .sensor-chip { cursor: default; opacity: 0.7; }

  .chip-label { overflow: hidden; text-overflow: ellipsis; }

  .chip-sub {
    color: var(--color-text-tertiary);
    font-size: 0.88em;
    overflow: hidden; text-overflow: ellipsis;
    max-width: 100px;
  }

  /* ── Climate expand ─────────────────────────────────────────────────── */
  .climate-expand {
    margin-top: 4px;
    padding: clamp(10px, 1.2vh, 16px);
    background: var(--color-surface-2);
    border-radius: 14px;
    border: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: 10px;
  }

  .cl-top-row { display: flex; align-items: baseline; gap: 10px; }

  .cl-temp {
    font-size: clamp(36px, 4vw, 56px);
    font-weight: 300; letter-spacing: -0.02em;
    color: var(--color-text-primary); line-height: 1;
  }

  .cl-badge {
    font-size: clamp(11px, 0.97vw, 14px); font-weight: 500;
    color: var(--color-text-tertiary);
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    padding: 2px 7px; border-radius: 999px;
  }

  .cl-setpt-row { display: flex; align-items: center; gap: 12px; }

  .cl-adj {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    font-size: 18px; cursor: pointer; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    transition: background 120ms;
    -webkit-tap-highlight-color: transparent;
  }
  .cl-adj:active { background: var(--color-surface-3, #2c2c32); }

  .cl-setpt {
    font-size: clamp(18px, 2vw, 26px); font-weight: 500;
    color: var(--color-text-primary); min-width: 3ch; text-align: center;
  }

  .cl-modes { display: flex; gap: 5px; flex-wrap: wrap; }

  .cl-mode {
    padding: 4px 12px; border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-1);
    color: var(--color-text-tertiary);
    font-size: clamp(12px, 1.04vw, 15px); font-weight: 500;
    cursor: pointer;
    transition: background 150ms, color 150ms, border-color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .cl-mode.active {
    background: color-mix(in srgb, var(--mc) 16%, var(--color-surface-1));
    border-color: color-mix(in srgb, var(--mc) 40%, transparent);
    color: var(--mc);
    font-weight: 600;
  }
  .cl-mode:not(.active):active { background: var(--color-surface-3, #2c2c32); }
</style>
