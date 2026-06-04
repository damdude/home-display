<script lang="ts">
  import { Music2, MoreHorizontal, Subtitles, ListMusic, Airplay } from 'lucide-svelte';
  import ProgressBar    from '$lib/components/music/ProgressBar.svelte';
  import VolumeControl  from '$lib/components/music/VolumeControl.svelte';
  import MusicTransport from '$lib/components/music/MusicTransport.svelte';
  import QuickStartRow  from '$lib/components/music/QuickStartRow.svelte';
  import CastPicker     from '$lib/components/music/CastPicker.svelte';
  import SourceBadge    from '$lib/components/music/SourceBadge.svelte';
  import { musicState }    from '$lib/stores/musicState.svelte.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  let player   = $derived(musicState.active);
  let castOpen = $state(false);

  // Helpers — fire-and-forget service calls on the active speaker's control entity
  function mp(service: string, extra: Record<string, unknown> = {}) {
    if (!player) return;
    callHaService('media_player', service, { entity_id: player.controlId, ...extra });
  }

  function cycleRepeat(cur: 'off' | 'one' | 'all') {
    const next = cur === 'off' ? 'one' : cur === 'one' ? 'all' : 'off';
    mp('repeat_set', { repeat: next });
  }

  // Idle / empty state helpers
  let hasTrack   = $derived(!!(player?.media.title));
  let isPlaying  = $derived(player?.state === 'playing');
  let isActive   = $derived(!!player && player.state !== 'off' && player.state !== 'unavailable');
  let idleOpacity = $derived(isActive ? '1' : '0.35');
</script>

<div class="page">

  <!-- ── 1. Artwork zone ───────────────────────────────────────────────── -->
  <div class="zone zone-art">
    <div class="art-outer">
      <div
        class="artwork"
        class:playing={isPlaying}
        class:paused={!isPlaying && hasTrack}
      >
        {#if player?.media.artwork}
          <img src={player.media.artwork} alt="Album art" class="art-img" />
        {:else}
          <div class="art-idle">
            <Music2 strokeWidth={1.1} />
          </div>
        {/if}

        <!-- Source badge — bottom-left overlay -->
        {#if hasTrack}
          <div class="source-badge">
            <SourceBadge
              appName={player!.media.appName}
              appId={player!.media.appId}
            />
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- ── 2. Track info ─────────────────────────────────────────────────── -->
  <div class="zone zone-track">
    <div class="track-row">
      <div class="track-text">
        <h2 class="title" class:idle={!hasTrack}>
          {hasTrack ? (player!.media.title ?? '') : 'Nothing playing'}
        </h2>
        <p class="sub">
          {#if hasTrack}
            {[player!.media.artist, player!.media.album].filter(Boolean).join(' · ')}
          {:else}
            Start something on a speaker
          {/if}
        </p>
      </div>
      <button class="more-btn" aria-label="More options">
        <MoreHorizontal size={22} strokeWidth={1.8} />
      </button>
    </div>
  </div>

  <!-- ── 3. Progress bar ────────────────────────────────────────────────── -->
  <div class="zone zone-progress" style:opacity={idleOpacity}>
    {#if !hasTrack || player?.media.duration == null}
      <!-- Live or empty: flat bar + LIVE label -->
      <div class="live-wrap">
        <div class="live-bar">
          {#if isPlaying}
            <div class="live-fill"></div>
          {/if}
        </div>
        {#if isPlaying && !player?.media.duration}
          <span class="live-label">LIVE</span>
        {:else}
          <div class="live-times">
            <span>0:00</span><span>–:––</span>
          </div>
        {/if}
      </div>
    {:else}
      <ProgressBar
        position={player!.media.position}
        duration={player!.media.duration}
        positionUpdatedAt={player!.media.positionUpdatedAt}
        playbackState={player!.state}
        canSeek={player!.caps.canSeek}
        onSeek={(s) => mp('media_seek', { seek_position: s })}
      />
    {/if}
  </div>

  <!-- ── 4. Transport ───────────────────────────────────────────────────── -->
  <div class="zone zone-transport" style:opacity={idleOpacity} style:pointer-events={isActive ? 'auto' : 'none'}>
    <MusicTransport
      playbackState={player?.state ?? 'off'}
      caps={player?.caps ?? {
        canPlay:false,canPause:false,canStop:false,canSeek:false,
        canPrevious:false,canNext:false,canVolume:false,canMute:false,
        canStep:false,canShuffle:false,canRepeat:false,canBrowse:false,canGroup:false
      }}
      shuffle={player?.media.shuffleOn ?? false}
      repeat={player?.media.repeat ?? 'off'}
      onPlay={() => mp('media_play')}
      onPause={() => mp('media_pause')}
      onPrevious={() => mp('media_previous_track')}
      onNext={() => mp('media_next_track')}
      onShuffleToggle={() => mp('shuffle_set', { shuffle: !player?.media.shuffleOn })}
      onRepeatCycle={() => cycleRepeat(player?.media.repeat ?? 'off')}
    />
  </div>

  <!-- ── 5. Volume ──────────────────────────────────────────────────────── -->
  <div class="zone zone-volume">
    <VolumeControl
      volume={player?.media.volume ?? null}
      muted={player?.media.muted ?? false}
      canSet={player?.caps.canVolume ?? false}
      canMute={player?.caps.canMute ?? false}
      canStep={player?.caps.canStep ?? false}
      onSet={(v) => mp('volume_set',  { volume_level: v })}
      onMute={() => mp('volume_mute', { is_volume_muted: !player?.media.muted })}
    />
  </div>

  <!-- ── 6. Utility row ─────────────────────────────────────────────────── -->
  <div class="zone zone-utility">
    <div class="util-row">
      <!-- Subtitles — placeholder -->
      <button class="util-btn" aria-label="Subtitles">
        <Subtitles size={22} strokeWidth={1.5} />
      </button>

      <!-- AirPlay / cast picker — inline SVG -->
      <button
        class="util-btn cast-btn"
        class:open={castOpen}
        aria-label="Choose speaker"
        onclick={() => castOpen = true}
      >
        <Airplay size={24} strokeWidth={1.5} />
      </button>

      <!-- Queue -->
      <button class="util-btn" aria-label="Queue">
        <ListMusic size={22} strokeWidth={1.5} />
      </button>
    </div>
  </div>

  <!-- ── 7. Quick Start ─────────────────────────────────────────────────── -->
  <div class="zone zone-quick">
    <p class="quick-label">Quick Start</p>
    <QuickStartRow />
  </div>

</div>

<!-- Cast picker sheet (fixed overlay) -->
<CastPicker open={castOpen} onClose={() => castOpen = false} />

<style>
  /* ── Full page grid — 7 rows, no scroll ── */
  .page {
    height: 100%;
    display: grid;
    grid-template-rows: 38fr 10fr 6fr 9fr 6fr 7fr 11fr;
    gap: clamp(4px, 0.55vh, 8px);
    padding: clamp(4px, 0.4vh, 6px) 6vw clamp(4px, 0.4vh, 6px);
    overflow: hidden;
    box-sizing: border-box;
    background: var(--color-canvas);
  }

  .zone { min-height: 0; display: flex; flex-direction: column; justify-content: center; }

  /* ── 1. Artwork ── */
  .zone-art { align-items: center; overflow: hidden; }

  .art-outer {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
  }

  .artwork {
    position: relative;
    width:  min(55vw, 42vh);
    height: min(55vw, 42vh);
    border-radius: 20px;
    overflow: hidden;
    background: var(--color-surface-2);
    box-shadow: 0 12px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3);
    /* Default: paused/idle */
    opacity: 0.45;
    transform: scale(0.96);
    transition:
      opacity  400ms cubic-bezier(0.32, 0.72, 0, 1),
      transform 400ms cubic-bezier(0.32, 0.72, 0, 1),
      filter   400ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .artwork.playing {
    opacity: 1;
    transform: scale(1);
  }
  /* When explicitly paused but has track (dimmer than idle) */
  .artwork.paused {
    opacity: 0.62;
    transform: scale(0.97);
  }

  .art-img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .art-idle {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.28;
  }
  .art-idle :global(svg) { width: 35%; height: 35%; }

  /* Source badge — bottom-left overlay on artwork */
  .source-badge {
    position: absolute; bottom: 10px; left: 10px;
    pointer-events: none;
  }
  /* Override badge appearance when overlaid on artwork */
  .source-badge :global(.badge) {
    --badge-bg:    rgba(0, 0, 0, 0.52);
    --badge-color: rgba(255, 255, 255, 0.88);
    font-size: 11px;
    padding: 2px 8px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  /* ── 2. Track info ── */
  .zone-track { justify-content: center; }

  .track-row {
    display: flex; align-items: flex-start; gap: 8px;
    width: 100%;
  }

  .track-text { flex: 1; min-width: 0; }

  .title {
    font-size: clamp(22px, 2.2vw, 30px);
    font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;
    color: var(--color-text-primary); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .title.idle { font-weight: 400; opacity: 0.5; }

  .sub {
    font-size: clamp(14px, 1.3vw, 18px);
    color: var(--color-text-secondary); margin: 0; opacity: 0.8;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.4;
  }

  .more-btn {
    border: none; background: none; cursor: pointer;
    color: var(--color-text-tertiary); flex-shrink: 0;
    padding: 4px;
    display: flex; align-items: center;
    opacity: 0.6;
    -webkit-tap-highlight-color: transparent;
  }

  /* ── 3. Progress ── */
  .zone-progress { justify-content: center; transition: opacity 200ms; }

  .live-wrap {
    display: flex; flex-direction: column; gap: 5px; width: 100%;
  }
  .live-bar {
    width: 100%; height: 8px;
    background: var(--color-surface-2);
    border-radius: 999px; overflow: hidden;
  }
  .live-fill {
    width: 100%; height: 100%;
    background: var(--color-accent-music);
    opacity: 0.5; border-radius: 999px;
    animation: livePulse 2s ease-in-out infinite;
  }
  @keyframes livePulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }

  .live-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    color: var(--color-accent-triggered); opacity: 0.8;
    text-align: center;
  }
  .live-times {
    display: flex; justify-content: space-between;
    font-size: clamp(12px, 1.04vw, 15px);
    color: var(--color-text-tertiary); opacity: 0.5;
  }

  /* ── 4. Transport ── */
  .zone-transport {
    transition: opacity 200ms;
  }

  /* ── 5. Volume ── */
  .zone-volume { justify-content: center; }

  /* ── 6. Utility row ── */
  .zone-utility { justify-content: center; }

  .util-row {
    display: flex; align-items: center; justify-content: space-around;
    width: 100%;
  }

  .util-btn {
    border: none; background: none; cursor: pointer;
    color: var(--color-text-tertiary); opacity: 0.6; padding: 8px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: opacity 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .util-btn:active { opacity: 0.9; }
  /* Airplay always tinted; dimmer when picker closed */
  .cast-btn        { color: var(--color-accent-music); opacity: 0.7; }
  .cast-btn.open   { opacity: 1; }

  /* ── 7. Quick start ── */
  .zone-quick { justify-content: flex-start; gap: 6px; }

  .quick-label {
    font-size: var(--type-label); font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase; letter-spacing: 0.09em;
    margin: 0; flex-shrink: 0;
  }

</style>
