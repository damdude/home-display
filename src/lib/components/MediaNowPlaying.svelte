<script lang="ts">
  /**
   * Home-tab compact Now Playing tile.
   *
   * Two states:
   *   • MA session (isMaManaged && appId = 'music_assistant') — full controls
   *   • External session (Amazon Music, Spotify, etc.)        — read-only, lock badge
   *
   * Layout: grid with artwork left, controls column right.
   * Tapping the card navigates to /music.
   */
  import { goto }      from '$app/navigation';
  import { Music2, Play, Pause, Lock, Speaker } from 'lucide-svelte';
  import CastPicker    from '$lib/components/music/CastPicker.svelte';
  import ProgressBar   from '$lib/components/music/ProgressBar.svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }    from '$lib/stores/musicState.svelte.js';

  interface Props { player: ResolvedPlayer | null; }
  let { player }: Props = $props();

  let isPlaying = $derived(player?.state === 'playing');
  let hasMedia  = $derived(!!(player?.media.title));
  let castOpen  = $state(false);

  // ── Session ownership ─────────────────────────────────────────────────────
  // MA sessions: full controls. External (Amazon Music, Spotify, etc.): read-only.
  let isExternalSession = $derived(
    !!(player?.media.appId) &&
    player!.media.appId !== 'music_assistant' &&
    player!.media.appId !== 'music_assistant_cast',
  );
  let canControl = $derived(!isExternalSession && !!(player?.isMaManaged));

  function getAppName(appId: string | null): string {
    if (!appId) return 'Unknown';
    const names: Record<string, string> = {
      amazon_music:         'Amazon Music',
      spotify:              'Spotify',
      youtube_music:        'YouTube Music',
      music_assistant:      'Music Assistant',
      music_assistant_cast: 'Music Assistant',
    };
    return names[appId] ?? appId.replace(/_/g, ' ');
  }

  // ── Play/Pause ────────────────────────────────────────────────────────────
  // ALL service calls use controlId (MA entity routes commands correctly).
  let pausePending = $state(false);
  let pauseTimer: ReturnType<typeof setTimeout>;

  function handlePlayPause() {
    if (!player || !canControl) return;
    musicState.setActive(player.controlId);
    clearTimeout(pauseTimer);

    if (isPlaying) {
      pausePending = true;
      callHaService('media_player', 'media_pause', { entity_id: player.controlId });

      // Fallback: if state hasn't left 'playing' after 3s, escalate to stop
      pauseTimer = setTimeout(() => {
        if (pausePending && player?.state === 'playing') {
          callHaService('media_player', 'media_stop', { entity_id: player.controlId });
        }
        pausePending = false;
      }, 3_000);
    } else {
      pausePending = false;
      callHaService('media_player', 'media_play', { entity_id: player.controlId });
    }
  }

  $effect(() => {
    if (player?.state !== 'playing') {
      clearTimeout(pauseTimer);
      pausePending = false;
    }
  });
</script>

<div class="now-playing">
  <div class="section-label">
    <Music2 size={13} strokeWidth={2} />
    <span>Now Playing</span>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="player-card" onclick={() => goto('/music')}>

    {#if player}

      <!-- ── LEFT: Artwork ── -->
      <div class="artwork" class:paused={!isPlaying && hasMedia}>
        {#if player.media.artwork}
          <img src={player.media.artwork} alt="Album art" class="art-img" />
        {:else}
          <div class="art-ph"><Music2 strokeWidth={1.1} /></div>
        {/if}
      </div>

      <!-- ── RIGHT: Controls column ── -->
      <div class="controls-column">

        <!-- 1. Session owner badge -->
        <span class="session-owner" class:external={isExternalSession}>
          {#if isExternalSession}
            <Lock size={11} strokeWidth={2} />
            {getAppName(player.media.appId)}
          {:else}
            <Music2 size={11} strokeWidth={2} />
            Music Assistant
          {/if}
        </span>

        <!-- 2. Track info -->
        <div class="track-info">
          <p class="title">
            {hasMedia ? (player.media.title ?? '') : 'Nothing playing'}
          </p>
          {#if player.media.artist}
            <p class="artist">{player.media.artist}</p>
          {/if}
        </div>

        <!-- 3. Speaker badge -->
        <div class="speaker-badge">
          <Speaker size={13} strokeWidth={1.8} />
          <span>{player.name}</span>
        </div>

        <!-- 4. Progress bar — MA sessions with known duration only -->
        {#if canControl && player.media.duration}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div onclick={(e) => e.stopPropagation()}>
            <ProgressBar
              position={player.media.position}
              duration={player.media.duration}
              positionUpdatedAt={player.media.positionUpdatedAt}
              playbackState={player.state}
              canSeek={player.caps.canSeek}
              onSeek={(s) => callHaService('media_player', 'media_seek', {
                entity_id: player.controlId, seek_position: s,
              })}
            />
          </div>
        {/if}

        <!-- 5. Transport row -->
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="transport-row" onclick={(e) => e.stopPropagation()}>
          <button
            class="play-btn"
            disabled={!canControl}
            onclick={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isExternalSession ? `Control from ${getAppName(player.media.appId)} app` : ''}
          >
            {#if isPlaying}
              <Pause size={20} strokeWidth={2} />
            {:else}
              <Play  size={20} strokeWidth={2} />
            {/if}
          </button>

          <button
            class="speaker-btn"
            disabled={!canControl}
            onclick={() => castOpen = true}
            title={isExternalSession ? `Control from ${getAppName(player.media.appId)} app` : 'Select speaker'}
          >
            Change speaker
          </button>
        </div>

        <!-- 6. External session notice -->
        {#if isExternalSession}
          <p class="external-notice">
            🔒 Control from {getAppName(player.media.appId)} app
          </p>
        {/if}

      </div>

    {:else}

      <!-- ── Idle state ── -->
      <div class="art-ph idle-ph"><Music2 strokeWidth={0.9} /></div>
      <div class="controls-column idle-col">
        <p class="nothing-playing">Nothing playing</p>
        <p class="nothing-sub">Tap to open Music tab</p>
      </div>

    {/if}

  </div>
</div>

<CastPicker open={castOpen} onClose={() => castOpen = false} />

<style>
  .now-playing {
    height: 100%; display: flex; flex-direction: column; gap: 0.35rem;
  }

  .section-label {
    display: flex; align-items: center; gap: 5px;
    color: var(--color-text-tertiary); font-size: var(--type-label);
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0.2rem;
  }

  /* ── Card: two-column grid ── */
  .player-card {
    flex: 1; min-height: 0;
    display: grid;
    grid-template-columns: minmax(clamp(90px, 11vw, 150px), 1fr) 2fr;
    gap: clamp(12px, 1.5vw, 20px);
    border-radius: 20px;
    padding: clamp(12px, 1.4vw, 18px);
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    cursor: pointer;
    transition: background 200ms;
    user-select: none;
    overflow: hidden;
  }
  .player-card:active { background: var(--color-surface-2); }

  /* ── Artwork ── */
  .artwork {
    width: 100%; aspect-ratio: 1;
    border-radius: 14px; overflow: hidden;
    background: var(--color-surface-2);
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    align-self: center;
    transition: opacity 300ms ease, filter 300ms ease;
  }
  .artwork.paused { opacity: 0.5; filter: saturate(0.5); }
  .art-img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .art-ph {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.28;
  }
  .art-ph :global(svg) { width: 40%; height: 40%; }

  /* Idle state placeholder — matches artwork column but no outer .artwork div */
  .idle-ph {
    border-radius: 14px;
    background: var(--color-surface-2);
    aspect-ratio: 1;
    align-self: center;
    width: 100%;
  }

  /* ── Controls column ── */
  .controls-column {
    display: flex; flex-direction: column;
    gap: clamp(5px, 0.7vw, 9px);
    justify-content: space-between;
    padding: clamp(2px, 0.3vw, 5px) 0;
    min-width: 0;
  }
  .idle-col { justify-content: center; gap: 6px; }

  /* Session owner badge */
  .session-owner {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 999px;
    background: rgba(155,123,181,0.12);
    font-size: clamp(10px, 0.85vw, 13px);
    font-weight: 500;
    color: var(--color-accent-music);
    width: fit-content;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .session-owner.external {
    background: rgba(198,107,107,0.12);
    color: var(--color-accent-triggered);
  }

  /* Track info */
  .track-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

  .title {
    font-size: clamp(14px, 1.3vw, 19px);
    font-weight: 600; color: var(--color-text-primary);
    line-height: 1.2; margin: 0;
    overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }

  .artist {
    font-size: clamp(11px, 0.95vw, 15px);
    color: var(--color-text-secondary); font-weight: 400; margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    opacity: 0.8;
  }

  /* Speaker badge */
  .speaker-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 8px; border-radius: 7px;
    background: rgba(255,255,255,0.04);
    font-size: clamp(10px, 0.88vw, 13px);
    color: var(--color-text-secondary);
    width: fit-content; max-width: 100%; overflow: hidden;
    flex-shrink: 0;
  }
  .speaker-badge span {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* Transport row: play button + speaker picker */
  .transport-row {
    display: flex; align-items: center;
    gap: clamp(8px, 1vw, 12px);
  }

  .play-btn {
    flex-shrink: 0;
    width:  clamp(38px, 4.2vw, 50px);
    height: clamp(38px, 4.2vw, 50px);
    border-radius: 50%;
    background: var(--color-accent-music);
    border: none; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 100ms ease, opacity 100ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  .play-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .play-btn:not(:disabled):active { transform: scale(0.92); }

  .speaker-btn {
    flex: 1; min-width: 0;
    padding: clamp(6px, 0.7vw, 9px) clamp(9px, 1vw, 13px);
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent; color: var(--color-text-secondary);
    font-size: clamp(10px, 0.88vw, 13px);
    cursor: pointer; text-align: left; white-space: nowrap;
    transition: background 100ms, border-color 100ms;
    -webkit-tap-highlight-color: transparent;
    overflow: hidden; text-overflow: ellipsis;
  }
  .speaker-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .speaker-btn:not(:disabled):active {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.22);
  }

  /* External session notice */
  .external-notice {
    font-size: clamp(10px, 0.82vw, 12px);
    color: var(--color-text-tertiary); font-style: italic; margin: 0;
  }

  /* Idle state text */
  .nothing-playing {
    font-size: clamp(14px, 1.3vw, 18px);
    font-weight: 500; color: var(--color-text-secondary);
    opacity: 0.5; margin: 0;
  }
  .nothing-sub {
    font-size: clamp(10px, 0.88vw, 13px);
    color: var(--color-text-tertiary); opacity: 0.5;
    margin: 0; font-style: italic;
  }
</style>
