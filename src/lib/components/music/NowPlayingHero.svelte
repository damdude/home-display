<script lang="ts">
  import { Music2, Airplay } from 'lucide-svelte';
  import SourceBadge    from './SourceBadge.svelte';
  import ProgressBar    from './ProgressBar.svelte';
  import VolumeControl  from './VolumeControl.svelte';
  import MusicTransport from './MusicTransport.svelte';
  import CastPicker     from './CastPicker.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  let castOpen = $state(false);

  interface Props {
    player: ResolvedPlayer | null;
  }
  let { player }: Props = $props();

  let isPlaying = $derived(player?.state === 'playing');
  let hasMedia  = $derived(!!(player?.media.title));

  // Service helpers — all fire-and-forget
  function mp(service: string, extra: Record<string, unknown> = {}) {
    if (!player) return;
    callHaService('media_player', service, { entity_id: player.controlId, ...extra });
  }

  function cycleRepeat(cur: 'off' | 'one' | 'all') {
    const next = cur === 'off' ? 'one' : cur === 'one' ? 'all' : 'off';
    mp('repeat_set', { repeat: next });
  }
</script>

<div class="hero">

  <!-- ── LEFT: album artwork ─────────────────────────────────────────────── -->
  <div class="art-wrap">
    <div
      class="artwork"
      class:paused={!isPlaying && hasMedia}
      class:idle={!hasMedia}
    >
      {#if player?.media.artwork}
        <img src={player.media.artwork} alt="Album art" class="art-img" />
      {:else}
        <div class="art-placeholder">
          <Music2 strokeWidth={1.1} />
        </div>
      {/if}
    </div>
  </div>

  <!-- ── RIGHT: metadata + controls ────────────────────────────────────── -->
  <div class="info">

    <!-- Source badge row -->
    <div class="badge-row">
      {#if hasMedia}
        <SourceBadge
          appName={player!.media.appName}
          appId={player!.media.appId}
        />
      {/if}
    </div>

    <!-- Track info -->
    <div class="track">
      <h2 class="title" class:idle={!hasMedia}>
        {hasMedia ? (player!.media.title ?? '') : 'Nothing playing'}
      </h2>
      {#if player?.media.artist}
        <p class="artist">{player.media.artist}</p>
      {/if}
      {#if player?.media.album}
        <p class="album">{player.media.album}</p>
      {/if}
      {#if !hasMedia}
        <p class="hint">Say "Hey Google" or tap a quick start below</p>
      {/if}
    </div>

    <!-- Progress bar (display-only for current Google Homes; seekable for MA) -->
    <div style:opacity={hasMedia ? '1' : '0.3'}>
      <ProgressBar
        position={player?.media.position           ?? null}
        duration={player?.media.duration           ?? null}
        positionUpdatedAt={player?.media.positionUpdatedAt ?? null}
        playbackState={player?.state ?? 'off'}
        canSeek={player?.caps.canSeek ?? false}
        onSeek={(s) => mp('media_seek', { seek_position: s })}
      />
    </div>

    <!-- Transport -->
    <div style:opacity={hasMedia ? '1' : '0.38'} style:pointer-events={hasMedia ? 'auto' : 'none'}>
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
        onShuffleToggle={() => mp('shuffle_set', { shuffle: !(player?.media.shuffleOn) })}
        onRepeatCycle={() => cycleRepeat(player?.media.repeat ?? 'off')}
      />
    </div>

    <!-- Volume -->
    {#if player && (player.caps.canVolume || player.caps.canStep || player.caps.canMute)}
      <VolumeControl
        volume={player.media.volume}
        muted={player.media.muted}
        canSet={player.caps.canVolume}
        canMute={player.caps.canMute}
        canStep={player.caps.canStep}
        onSet={(v) => mp('volume_set',   { volume_level: v })}
        onMute={()  => mp('volume_mute', { is_volume_muted: !player.media.muted })}
      />
    {/if}

    <!-- Speaker selector -->
    <button
      class="speaker-btn"
      class:picker-open={castOpen}
      onclick={() => castOpen = true}
      aria-label="Choose speaker"
    >
      <Airplay size={22} strokeWidth={1.5} />
      <span class="speaker-name">{player?.name ?? 'No speaker'}</span>
      <span class="chevron" aria-hidden="true">▾</span>
    </button>

  </div>
</div>

<CastPicker open={castOpen} onClose={() => castOpen = false} />

<style>
  .hero {
    display: grid;
    grid-template-columns: 42fr 58fr;
    gap: clamp(16px, 2vw, 28px);
    height: 100%;
    align-items: center;
    overflow: hidden;
  }

  /* ── Artwork ── */
  .art-wrap {
    display: flex; align-items: center; justify-content: center;
    height: 100%;
  }

  .artwork {
    /* Responsive square: ~45% of tile width (tile is ~90vw wide, this col is 42%) */
    width:  clamp(200px, 20.4vw, 340px);
    height: clamp(200px, 20.4vw, 340px);
    border-radius: 24px;
    overflow: hidden;
    background: var(--color-surface-2);
    box-shadow: 0 8px 40px rgba(0,0,0,0.45);
    transition: opacity 300ms ease, filter 300ms ease;
    flex-shrink: 0;
  }
  .artwork.paused { opacity: 0.82; filter: saturate(0.6); }
  .artwork.idle   { opacity: 0.35; }

  .art-img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .art-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.35;
  }
  .art-placeholder :global(svg) {
    width: 38%; height: 38%;
  }

  /* ── Info column ── */
  .info {
    display: flex; flex-direction: column;
    gap: clamp(8px, 1vh, 14px);
    min-width: 0; height: 100%;
    justify-content: center;
    padding: clamp(4px, 0.5vh, 8px) 0;
  }

  .badge-row { min-height: 22px; }

  /* Track */
  .track { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }

  .title {
    font-size: clamp(26px, 2.8vw, 42px);
    font-weight: 600; letter-spacing: -0.02em; line-height: 1.15;
    color: var(--color-text-primary); margin: 0;
    overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .title.idle { font-weight: 400; opacity: 0.55; font-size: clamp(22px, 2.2vw, 34px); }

  .artist {
    font-size: clamp(18px, 1.85vw, 28px);
    font-weight: 400; color: var(--color-text-primary);
    opacity: 0.72; margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .album {
    font-size: clamp(14px, 1.3vw, 20px);
    font-weight: 400; color: var(--color-text-secondary);
    opacity: 0.58; margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .hint {
    font-size: clamp(13px, 1.1vw, 16px);
    color: var(--color-text-tertiary); opacity: 0.7;
    margin: 0; font-style: italic;
  }

  /* Speaker button */
  .speaker-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    font-size: clamp(12px, 1.04vw, 15px);
    cursor: pointer; align-self: flex-start;
    transition: background 150ms, border-color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .speaker-btn:active { background: var(--color-surface-3); }

  .speaker-name {
    max-width: clamp(100px, 12vw, 200px);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .chevron { font-size: 10px; opacity: 0.6; }

  .speaker-btn.picker-open {
    color: var(--color-accent-music);
    border-color: color-mix(in srgb, var(--color-accent-music) 35%, transparent);
  }

</style>
