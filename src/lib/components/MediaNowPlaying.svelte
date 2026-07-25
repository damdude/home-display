<script lang="ts">
  /**
   * Home-tab compact Now Playing tile.
   *
   * Two states:
   *   • Nothing playing / no player → thin "empty-bar"
   *   • Media playing/paused        → screensaver-style card (art + meta + progress + transport)
   */
  import { goto }      from '$app/navigation';
  import { Music2, Play, Pause, SkipBack, SkipForward, Speaker } from 'lucide-svelte';
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
  let isExternalSession = $derived(
    !!(player?.media.appId) &&
    player!.media.appId !== 'music_assistant' &&
    player!.media.appId !== 'music_assistant_cast',
  );
  let canControl = $derived(!isExternalSession && !!(player?.isMaManaged));

  // ── Transport helper ──────────────────────────────────────────────────────
  function mp(service: string) {
    if (!player) return;
    callHaService('media_player', service, { entity_id: player.controlId });
  }

  // ── Play/Pause with stop-fallback ─────────────────────────────────────────
  let pausePending = $state(false);
  let pauseTimer: ReturnType<typeof setTimeout>;

  function handlePlayPause() {
    if (!player || !canControl) return;
    musicState.setActive(player.controlId);
    clearTimeout(pauseTimer);

    if (isPlaying) {
      pausePending = true;
      callHaService('media_player', 'media_pause', { entity_id: player.controlId });

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

  {#if !player || !hasMedia}
    <!-- Thin empty bar -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="empty-bar" onclick={() => goto('/music')}>
      <span>Nothing playing</span>
    </div>

  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="np-card" onclick={() => goto('/music')}>

      <!-- Artwork with transport controls overlaid -->
      <div class="np-art" class:paused={!isPlaying}>
        {#if player.media.artwork}
          <img src={player.media.artwork} alt="" />
        {:else}
          <div class="np-art-ph"><Music2 strokeWidth={1.1} /></div>
        {/if}

        <!-- Controls overlaid on the artwork -->
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="np-overlay" onclick={(e) => e.stopPropagation()}>
          <button class="np-ctrl" disabled={!canControl || !player.caps.canPrevious}
            onclick={() => mp('media_previous_track')} aria-label="Previous">
            <SkipBack size={20} strokeWidth={2} />
          </button>
          <button class="np-ctrl np-play" disabled={!canControl}
            onclick={handlePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {#if isPlaying}<Pause size={24} strokeWidth={2} />{:else}<Play size={24} strokeWidth={2} />{/if}
          </button>
          <button class="np-ctrl" disabled={!canControl || !player.caps.canNext}
            onclick={() => mp('media_next_track')} aria-label="Next">
            <SkipForward size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <!-- Meta column -->
      <div class="np-meta">
        <span class="np-title">{player.media.title ?? 'Now Playing'}</span>
        {#if player.media.artist}
          <span class="np-artist">{player.media.artist}</span>
        {/if}
        <span class="np-speaker">
          <Speaker size={14} strokeWidth={1.8} />
          {player.name}
        </span>
        {#if canControl && player.media.duration}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="np-progress" onclick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  {/if}
</div>

<CastPicker open={castOpen} onClose={() => castOpen = false} />

<style>
  .now-playing {
    display: flex; flex-direction: column; gap: 0.35rem;
  }

  .section-label {
    display: flex; align-items: center; gap: 5px;
    color: var(--color-text-tertiary); font-size: var(--type-label);
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0.2rem;
  }

  /* ── Empty bar ── */
  .empty-bar {
    min-height: 56px;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    cursor: pointer;
    transition: background 200ms;
    -webkit-tap-highlight-color: transparent;
  }
  .empty-bar:active { background: var(--color-surface-2); }
  .empty-bar span {
    font-size: clamp(14px, 1.5vw, 18px);
    font-weight: 400;
    color: var(--color-text-tertiary);
    font-style: italic;
    opacity: 0.55;
  }

  /* ── Player card — compact row; artwork carries the controls ── */
  .np-card {
    display: flex; flex-direction: row; align-items: center;
    gap: 16px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 22px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 12px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    overflow: hidden;
    transition: background 200ms;
    height: 112px;              /* fixed, compact — keeps Home on one screen */
  }
  .np-card:active { background: var(--color-surface-2); }

  /* Artwork — square, sized to the card height, controls overlaid */
  .np-art {
    position: relative;
    width: 88px; height: 88px;   /* moderate — NOT full card height */
    flex-shrink: 0;
    border-radius: 14px; overflow: hidden;
    background: var(--color-surface-2);
    box-shadow: 0 4px 14px rgba(0,0,0,0.35);
    transition: filter 300ms ease;
  }
  .np-art.paused { filter: saturate(0.55) brightness(0.9); }
  .np-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .np-art-ph {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-text-tertiary); opacity: 0.35;
  }
  .np-art-ph :global(svg) { width: 40%; height: 40%; }

  /* Controls overlaid ON the artwork */
  .np-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 4px;
    background: rgba(0,0,0,0.42);      /* scrim so buttons read on any art */
    backdrop-filter: blur(1px);
  }

  .np-ctrl {
    border: none; background: none; cursor: pointer;
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    padding: 4px; border-radius: 50%;
    -webkit-tap-highlight-color: transparent;
    filter: drop-shadow(0 1px 4px rgba(0,0,0,0.6));
    transition: transform 100ms ease, opacity 100ms ease;
  }
  .np-ctrl:disabled { opacity: 0.35; pointer-events: none; }
  .np-ctrl:active:not(:disabled) { transform: scale(0.88); }

  /* Play button — neutral, NO purple */
  .np-play {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    color: #fff;
    padding: 0;
  }
  .np-play:disabled { opacity: 0.4; }

  /* Meta column */
  .np-meta {
    display: flex; flex-direction: column; justify-content: center; gap: 3px;
    min-width: 0; flex: 1;
  }
  .np-title {
    font-size: clamp(17px, 1.9vw, 23px); font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;
  }
  .np-artist {
    font-size: clamp(13px, 1.4vw, 17px); color: var(--color-text-secondary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-speaker {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: clamp(11px, 1.2vw, 15px); color: var(--color-text-tertiary);
  }
  .np-progress { width: 100%; margin-top: 6px; }
</style>
