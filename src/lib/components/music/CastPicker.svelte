<script lang="ts">
  /**
   * Floating cast/AirPlay picker card.
   * Centered on screen, not anchored to bottom edge.
   * Supports multi-speaker selection.
   */
  import { fly, fade }    from 'svelte/transition';
  import { cubicOut }     from 'svelte/easing';
  import { Speaker, Tv2, Check, Music2, LayoutGrid } from 'lucide-svelte';
  import { musicState }    from '$lib/stores/musicState.svelte.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';

  interface Props {
    open:    boolean;
    onClose: () => void;
  }
  let { open, onClose }: Props = $props();

  // ── Speaker allowlist — shown in this exact order ─────────────────────────
  const ALLOWLIST: Array<{ id: string; label: string; icon: typeof Speaker }> = [
    { id: 'media_player.maindoor_speaker_2', label: 'Maindoor Speaker', icon: Speaker },
    { id: 'media_player.second_speaker_2',   label: 'Second Speaker',   icon: Speaker },
    { id: 'media_player.bbox',               label: 'Apple TV',         icon: Tv2     },
    // Pre-MA fallbacks
    { id: 'media_player.maindoor_speaker',   label: 'Maindoor Speaker', icon: Speaker },
    { id: 'media_player.second_speaker',     label: 'Second Speaker',   icon: Speaker },
  ];

  const ALL_IDS = ['media_player.maindoor_speaker_2', 'media_player.second_speaker_2', 'media_player.bbox'];
  const MAX_VISIBLE = 4;

  let showAll = $state(false);

  // Deduplicated speaker list matched against live players
  let speakers = $derived.by(() => {
    const allPlayers = musicState.players;
    const seen = new Set<string>();
    const result: Array<{ entry: typeof ALLOWLIST[0]; player: ResolvedPlayer | undefined }> = [];

    for (const entry of ALLOWLIST) {
      if (seen.has(entry.label)) continue;
      const player = allPlayers.find(p => p.controlId === entry.id);
      if (player || allPlayers.length === 0) {
        seen.add(entry.label);
        result.push({ entry, player });
      }
    }
    if (!result.length) {
      return allPlayers.map(p => ({
        entry: { id: p.controlId, label: p.name, icon: Speaker as typeof Speaker },
        player: p,
      }));
    }
    return result;
  });

  let visible  = $derived(showAll ? speakers : speakers.slice(0, MAX_VISIBLE));
  let overflow = $derived(speakers.length - MAX_VISIBLE);

  // ── Multi-select state ────────────────────────────────────────────────────
  let selectedIds = $state(new Set<string>([musicState.active?.controlId ?? '']));

  // Sync initial selection when picker opens
  $effect(() => {
    if (open) selectedIds = new Set([musicState.active?.controlId ?? '']);
  });

  function toggleSpeaker(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id); // can't deselect the last one
    } else {
      next.add(id);
    }
    selectedIds = next;
    applySelection();
  }

  function applySelection() {
    const ids = [...selectedIds].filter(Boolean);
    if (!ids.length) return;
    if (ids.length === 1) {
      callHaService('media_player', 'media_play', { entity_id: ids[0] });
      musicState.setActive(ids[0]);
    } else {
      callHaService('media_player', 'join', {
        entity_id:      ids[0],
        group_members:  ids.slice(1),
      });
      musicState.setActive(ids[0]);
    }
  }

  function selectAll() {
    // Use whichever IDs actually exist in the current player list
    const existingIds = speakers.map(s => s.entry.id);
    // Also include ALL_IDS as desired targets even if not yet resolved
    const combined = [...new Set([...existingIds, ...ALL_IDS])];
    selectedIds = new Set(combined);
    applySelection();
  }

  let active = $derived(musicState.active);

  function volPct(p: ResolvedPlayer | undefined): number {
    if (!p || p.state === 'off' || p.state === 'unavailable') return 0;
    return (p.media.volume ?? 0) * 100;
  }

  function volText(p: ResolvedPlayer | undefined): string {
    if (!p || p.state === 'off')          return 'Off';
    if (p.state === 'unavailable')        return 'Unavailable';
    if (p.state === 'idle')               return 'Idle';
    if (p.media.volume != null)           return `${Math.round(p.media.volume * 100)}%`;
    return '';
  }
</script>

{#if open}
  <!-- Scrim -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={onClose}></div>

  <!-- Floating card — slides up above bottom nav -->
  <div
    class="card"
    role="dialog"
    aria-label="Choose speaker"
    aria-modal="true"
    transition:fly={{ y: 320, duration: 380, easing: cubicOut }}
  >
    <!-- Header: now-playing + Done -->
    <div class="header">
      <div class="np-row">
        {#if active?.media.title}
          <div class="np-art">
            {#if active.media.artwork}
              <img src={active.media.artwork} alt="" class="np-art-img" />
            {:else}
              <div class="np-art-ph"><Music2 size={20} strokeWidth={1.3} /></div>
            {/if}
          </div>
          <div class="np-text">
            <p class="np-title">{active.media.title}</p>
            {#if active.media.artist}
              <p class="np-artist">{active.media.artist}</p>
            {/if}
          </div>
        {:else}
          <p class="np-idle">No active playback</p>
        {/if}
      </div>

      <button class="done-btn" onclick={onClose} aria-label="Done">Done</button>
    </div>

    <div class="divider"></div>

    <!-- Section label -->
    <p class="section-label">Listening On</p>

    <!-- Speaker rows -->
    <div class="speaker-list">
      {#each visible as { entry, player: sp } (entry.id)}
        {@const isSelected = selectedIds.has(entry.id)}
        {@const fillPct    = volPct(sp)}

        <button
          class="speaker-row"
          class:selected={isSelected}
          onclick={() => toggleSpeaker(entry.id)}
          aria-pressed={isSelected}
          aria-label={entry.label}
        >
          <!-- Volume fill bar — behind content -->
          <div class="vol-fill" style:width="{fillPct}%"></div>

          <span class="sp-icon">
            <entry.icon size={20} strokeWidth={1.5} />
          </span>
          <span class="sp-body">
            <span class="sp-name">{entry.label}</span>
            {#if volText(sp)}
              <span class="sp-sub">{volText(sp)}</span>
            {/if}
          </span>
          {#if isSelected}
            <Check size={18} strokeWidth={2.5} color="var(--color-accent-music)" />
          {/if}
        </button>
      {/each}

      {#if !showAll && overflow > 0}
        <button class="show-more" onclick={() => showAll = true}>
          Show {overflow} more…
        </button>
      {/if}

      <!-- All Speakers & TVs -->
      <div class="all-divider"></div>
      <button class="all-btn" onclick={selectAll} aria-label="Select all speakers">
        <span class="all-icon"><LayoutGrid size={18} strokeWidth={1.5} /></span>
        <span>All Speakers &amp; TVs</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 120;
    background: rgba(0, 0, 0, 0.55);
  }

  /* Floating card — slides up from bottom, sits above the bottom nav */
  .card {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    width: min(85vw, 500px);
    max-height: 65vh;
    border-radius: 20px;
    z-index: 121;
    background: rgba(28, 28, 32, 0.97);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.09);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 16px 16px 0;
  }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-shrink: 0; padding-bottom: 14px;
  }

  .np-row {
    display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
  }

  .np-art {
    width: 44px; height: 44px; border-radius: 8px;
    overflow: hidden; background: var(--color-surface-2); flex-shrink: 0;
  }
  .np-art-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .np-art-ph {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.35;
  }

  .np-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .np-title {
    font-size: clamp(13px, 1.2vw, 17px); font-weight: 600;
    color: var(--color-text-primary); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-artist {
    font-size: clamp(11px, 1vw, 14px); color: var(--color-text-tertiary);
    margin: 0; opacity: 0.72;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-idle {
    flex: 1; font-size: clamp(13px, 1.1vw, 16px);
    color: var(--color-text-tertiary); margin: 0;
    font-style: italic; text-align: center;
  }

  .done-btn {
    border: none; background: none; cursor: pointer; flex-shrink: 0;
    font-size: clamp(14px, 1.25vw, 17px); font-weight: 600;
    color: var(--color-accent-music); padding: 4px 8px;
    -webkit-tap-highlight-color: transparent;
  }

  .divider { height: 1px; background: rgba(255,255,255,0.07); margin: 0 -16px; flex-shrink: 0; }

  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--color-text-tertiary);
    opacity: 0.6; margin: 12px 0 6px; flex-shrink: 0;
  }

  /* ── Speaker list ── */
  .speaker-list {
    display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto; scrollbar-width: none;
    flex: 1;
    padding-bottom: 12px;
  }
  .speaker-list::-webkit-scrollbar { display: none; }

  /* Speaker row — relative for vol-fill positioning */
  .speaker-row {
    position: relative; overflow: hidden;
    display: flex; align-items: center; gap: 12px;
    padding: 14px 12px; border-radius: 14px;
    background: transparent; border: none; cursor: pointer;
    text-align: left; width: 100%;
    transition: background 140ms;
    -webkit-tap-highlight-color: transparent;
  }
  .speaker-row.selected { background: rgba(255,255,255,0.05); }
  .speaker-row:not(.selected):active { background: rgba(255,255,255,0.03); }

  /* Volume fill bar — absolute behind content */
  .vol-fill {
    position: absolute; left: 0; top: 0; bottom: 0;
    background: color-mix(in srgb, var(--color-accent-music) 18%, transparent);
    border-radius: inherit;
    pointer-events: none;
    transition: width 600ms ease;
  }

  .sp-icon {
    color: var(--color-text-secondary); flex-shrink: 0;
    display: flex; align-items: center; position: relative;
  }
  .speaker-row.selected .sp-icon { color: var(--color-accent-music); }

  .sp-body {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 2px;
    position: relative; /* above vol-fill */
  }
  .sp-name {
    font-size: clamp(15px, 1.39vw, 19px); font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sp-sub {
    font-size: clamp(11px, 1vw, 14px); color: var(--color-text-tertiary); opacity: 0.7;
  }

  /* Check icon — above vol-fill */
  .speaker-row :global(svg[data-lucide]) { position: relative; }

  .show-more {
    border: none; background: none; cursor: pointer;
    font-size: clamp(13px, 1.1vw, 15px);
    color: var(--color-accent-music); opacity: 0.8;
    padding: 8px 12px; text-align: left;
    -webkit-tap-highlight-color: transparent;
  }

  /* All Speakers divider + button */
  .all-divider {
    height: 1px; background: rgba(255,255,255,0.07);
    margin: 4px -16px 2px;
    flex-shrink: 0;
  }

  .all-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 12px; border-radius: 14px;
    border: none; background: transparent; cursor: pointer;
    color: var(--color-accent-music);
    font-size: clamp(14px, 1.3vw, 18px); font-weight: 500;
    width: 100%; text-align: left;
    transition: background 140ms;
    -webkit-tap-highlight-color: transparent;
  }
  .all-btn:active { background: rgba(255,255,255,0.04); }

  .all-icon { display: flex; align-items: center; }
</style>
