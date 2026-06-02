<script lang="ts">
  /**
   * Four hardcoded Quick Start tiles.
   *
   * Tile 1 — Resume Spotify : Google Assistant conversation.process
   * Tile 2 — KEXP Radio     : media_player.play_media with KEXP MP3 stream
   * Tile 3 — Daily Mix      : Google Assistant conversation.process
   * Tile 4 — Quiet Mode     : pause all + set volume to 0.2
   *
   * The active speaker at the time of tap is used as the target.
   * Tile actions are fire-and-forget; the Now Playing zone updates within
   * 1-2 seconds once the speaker picks up the new playback.
   */
  import { Music2, Radio, Shuffle, Volume1 } from 'lucide-svelte';
  import QuickStartTile from './QuickStartTile.svelte';
  import { callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }   from '$lib/stores/musicState.svelte.js';

  // Default speaker entity to target when nothing is active
  const DEFAULT_SPEAKER = 'media_player.maindoor_speaker';
  const KEXP_STREAM     = 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3';

  function targetId(): string {
    return musicState.active?.controlId ?? DEFAULT_SPEAKER;
  }

  function resumeSpotify() {
    callHaService('conversation', 'process', {
      text: `resume spotify on ${musicState.active?.name ?? 'maindoor speaker'}`,
      language: 'en',
    });
  }

  function playKEXP() {
    callHaService('media_player', 'play_media', {
      entity_id:         targetId(),
      media_content_id:  KEXP_STREAM,
      media_content_type: 'music',
    });
  }

  function playDailyMix() {
    callHaService('conversation', 'process', {
      text: `play my daily mix on amazon music on ${musicState.active?.name ?? 'maindoor speaker'}`,
      language: 'en',
    });
  }

  async function quietMode() {
    const playing = musicState.players.filter(p => p.state === 'playing');
    for (const p of playing) {
      await callHaService('media_player', 'media_pause',  { entity_id: p.controlId });
      await callHaService('media_player', 'volume_set',   { entity_id: p.controlId, volume_level: 0.2 });
    }
    if (!playing.length) {
      // Nothing playing, just set volume down on active speaker
      callHaService('media_player', 'volume_set', { entity_id: targetId(), volume_level: 0.2 });
    }
  }
</script>

<div class="row">
  <QuickStartTile label="Resume Spotify"  color="#1DB954" onclick={resumeSpotify}>
    <Music2 strokeWidth={1.4} />
  </QuickStartTile>

  <QuickStartTile label="KEXP Radio" color="var(--color-accent-info)" onclick={playKEXP}>
    <Radio strokeWidth={1.4} />
  </QuickStartTile>

  <QuickStartTile label="Daily Mix" color="#FF9900" onclick={playDailyMix}>
    <Shuffle strokeWidth={1.4} />
  </QuickStartTile>

  <QuickStartTile label="Quiet Mode" color="var(--color-accent-safe)" onclick={quietMode}>
    <Volume1 strokeWidth={1.4} />
  </QuickStartTile>
</div>

<style>
  .row {
    display: flex;
    align-items: stretch;
    gap: clamp(8px, 1vw, 14px);
    height: 100%;
  }
</style>
