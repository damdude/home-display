<script lang="ts">
  import { goto }   from '$app/navigation';
  import { Speaker, Tv2, Play, Pause } from 'lucide-svelte';
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';
  import { musicState } from '$lib/stores/musicState.svelte.js';
  import type { ZoneEntity } from '$lib/stores/zonesStore.svelte.js';

  interface Props { entities: ZoneEntity[]; }
  let { entities }: Props = $props();

  // Allowlist: skip AirPlay receivers (_3 suffix) and nritya_kala_kendra
  const SKIP_PATTERN = /(_3$|nritya_kala_kendra)/;

  const DISPLAY_NAMES: Record<string, string> = {
    'media_player.maindoor_speaker_2': 'Maindoor Speaker',
    'media_player.maindoor_speaker':   'Maindoor Speaker',
    'media_player.second_speaker_2':   'Second Speaker',
    'media_player.second_speaker':     'Second Speaker',
    'media_player.bbox':               'Apple TV',
  };

  function displayName(entityId: string): string {
    return DISPLAY_NAMES[entityId] ?? entityId.replace('media_player.', '').replace(/_/g, ' ');
  }

  function isAppleTV(entityId: string): boolean {
    return entityId.includes('bbox') || entityId.includes('apple_tv');
  }

  let speakers = $derived(
    entities.filter(e => !SKIP_PATTERN.test(e.entity_id))
  );

  function trackLabel(entityId: string): string {
    const ent = haStore.entities[entityId];
    if (!ent) return 'Unknown';
    const title  = ent.attributes?.media_title  as string | null;
    const artist = ent.attributes?.media_artist as string | null;
    if (title) return artist ? `${title} — ${artist}` : title;
    const state = ent.state;
    return state === 'playing' ? 'Playing' : state === 'paused' ? 'Paused' : 'Idle';
  }

  function tapRow(entityId: string) {
    musicState.setActive(entityId);
    void goto('/music');
  }

  function togglePlay(e: MouseEvent, entityId: string) {
    e.stopPropagation();
    const state = haStore.entities[entityId]?.state;
    callHaService('media_player', state === 'playing' ? 'media_pause' : 'media_play',
      { entity_id: entityId });
  }
</script>

<div class="media-section">
  {#each speakers as sp (sp.entity_id)}
    {@const state   = haStore.entities[sp.entity_id]?.state ?? 'off'}
    {@const playing = state === 'playing'}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="speaker-row" onclick={() => tapRow(sp.entity_id)}>
      <span class="sp-icon" class:active={playing}>
        {#if isAppleTV(sp.entity_id)}
          <Tv2 size={18} strokeWidth={1.5} />
        {:else}
          <Speaker size={18} strokeWidth={1.5} />
        {/if}
      </span>
      <span class="sp-info">
        <span class="sp-name">{displayName(sp.entity_id)}</span>
        <span class="sp-track">{trackLabel(sp.entity_id)}</span>
      </span>
      <button
        class="pp-btn"
        class:playing
        onclick={(e) => togglePlay(e, sp.entity_id)}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {#if playing}
          <Pause size={18} strokeWidth={1.8} />
        {:else}
          <Play  size={18} strokeWidth={1.8} />
        {/if}
      </button>
    </div>
  {/each}
</div>

<style>
  .media-section { display: flex; flex-direction: column; gap: 4px; }

  .speaker-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 4px; border-radius: 12px; cursor: pointer;
    transition: background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .speaker-row:active { background: var(--color-surface-2); }

  .sp-icon {
    color: var(--color-text-tertiary); opacity: 0.65;
    flex-shrink: 0; display: flex; align-items: center;
    transition: color 150ms, opacity 150ms;
  }
  .sp-icon.active { color: var(--color-accent-music); opacity: 1; }

  .sp-info {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 1px;
  }
  .sp-name {
    font-size: clamp(14px, 1.3vw, 18px); font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sp-track {
    font-size: clamp(12px, 1.04vw, 15px); color: var(--color-text-tertiary);
    opacity: 0.7;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .pp-btn {
    border: none; background: none; cursor: pointer;
    color: var(--color-text-secondary); padding: 6px; border-radius: 50%;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    transition: background 150ms, color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .pp-btn.playing { color: var(--color-accent-music); }
  .pp-btn:active { background: var(--color-surface-2); }
</style>
