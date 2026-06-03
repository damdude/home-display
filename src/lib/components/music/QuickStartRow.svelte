<script lang="ts">
  import { Play, Radio, Sparkles, VolumeX } from 'lucide-svelte';
  import QuickStartTile  from './QuickStartTile.svelte';
  import { callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState }   from '$lib/stores/musicState.svelte.js';

  const DEFAULT_SPEAKER = 'media_player.maindoor_speaker';
  const KEXP_STREAM     = 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3';

  function targetId(): string {
    return musicState.active?.controlId ?? DEFAULT_SPEAKER;
  }

  function resume() {
    callHaService('media_player', 'media_play', { entity_id: targetId() });
  }

  function playKEXP() {
    callHaService('media_player', 'play_media', {
      entity_id:          targetId(),
      media_content_id:   KEXP_STREAM,
      media_content_type: 'music',
    });
  }

  function quietMode() {
    for (const p of musicState.players) {
      callHaService('media_player', 'volume_set', {
        entity_id:    p.controlId,
        volume_level: 0.2,
      });
    }
  }
</script>

<div class="row">
  <QuickStartTile
    label="Resume"
    color="var(--color-accent-music)"
    onclick={resume}
  >
    <Play strokeWidth={1.5} />
  </QuickStartTile>

  <QuickStartTile
    label="KEXP Radio"
    color="var(--color-accent-info)"
    onclick={playKEXP}
  >
    <Radio strokeWidth={1.5} />
  </QuickStartTile>

  <QuickStartTile
    label="Daily Mix"
    color="var(--color-accent-neutral)"
    disabled
  >
    <Sparkles strokeWidth={1.5} />
  </QuickStartTile>

  <QuickStartTile
    label="Quiet Mode"
    color="var(--color-accent-safe)"
    onclick={quietMode}
  >
    <VolumeX strokeWidth={1.5} />
  </QuickStartTile>
</div>

<style>
  .row {
    display: flex;
    gap: clamp(6px, 0.8vw, 10px);
    width: 100%;
    align-items: stretch;
  }
</style>
