<script lang="ts">
  /**
   * Floating cast/AirPlay picker card.
   * Single-tap = transfer playback to that speaker.
   * Multi-select grouping via selectAll or future long-press UI.
   */
  import { fly, fade }    from 'svelte/transition';
  import { cubicOut }     from 'svelte/easing';
  import { Speaker, Tv2, Music2, LayoutGrid } from 'lucide-svelte';
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

  // ── Selection state ───────────────────────────────────────────────────────
  let selectedIds = $state(new Set<string>([musicState.active?.controlId ?? '']));

  // Sync initial selection when picker opens
  $effect(() => {
    if (open) selectedIds = new Set([musicState.active?.controlId ?? '']);
  });

  /**
   * Single-tap: transfer playback exclusively to this speaker.
   * If already the only selection, tapping again does nothing.
   */
  function toggleSpeaker(id: string) {
    if (selectedIds.has(id) && selectedIds.size === 1) {
      // Already the only active speaker — no-op
      return;
    }
    if (selectedIds.has(id) && selectedIds.size > 1) {
      // Deselect from a group
      const next = new Set(selectedIds);
      next.delete(id);
      selectedIds = next;
      applySelection();
    } else {
      // Transfer: clear all others, play on this speaker exclusively
      selectedIds = new Set([id]);
      applySelection();
    }
  }

  function applySelection() {
    const ids = [...selectedIds].filter(Boolean);
    if (!ids.length) return;

    if (ids.length === 1) {
      // Single speaker: transfer playback
      callHaService('media_player', 'media_play', { entity_id: ids[0] });
      musicState.setActive(ids[0]);
    } else {
      // Multi-speaker: group
      callHaService('media_player', 'join', {
        entity_id:     ids[0],
        group_members: ids.slice(1),
      });
      musicState.setActive(ids[0]);
    }
  }

  function selectAll() {
    const allIds = [...new Set([
      ...speakers.map(s => s.entry.id),
      ...ALL_IDS,
    ])].filter(Boolean);
    selectedIds = new Set(allIds);
    applySelection();
  }

  let active = $derived(musicState.active);

  function volPct(p: ResolvedPlayer | undefined): number {
    if (!p || p.state === 'off' || p.state === 'unavailable') return 0;
    return (p.media.volume ?? 0) * 100;
  }

  function volText(p: ResolvedPlayer | undefined): string {
    if (!p || p.state === 'off')    return 'Off';
    if (p.state === 'unavailable')  return 'Unavailable';
    if (p.state === 'idle')         return 'Idle';
    if (p.media.volume != null)     return `${Math.round(p.media.volume * 100)}%`;
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
    <p class="section-label">Speakers</p>

    <!-- Speaker rows -->
    <div class="speaker-list">
      {#each visible as { entry, player: sp } (entry.id)}
        {@const isSelected = selectedIds.has(entry.id)}

        <button
          class="speaker-row"
          class:selected={isSelected}
          onclick={() => toggleSpeaker(entry.id)}
          aria-pressed={isSelected}
          aria-label={entry.label}
        >
          <!-- Icon box -->
          <span class="icon-box">
            <entry.icon size={20} strokeWidth={1.5} />
          </span>

          <!-- Name + subtitle -->
          <span class="sp-body">
            <span class="sp-name">{entry.label}</span>
            {#if volText(sp)}
              <span class="sp-sub">{volText(sp)}</span>
            {/if}
          </span>

          <!-- Radio button -->
          <span class="radio" class:checked={isSelected}>
            {#if isSelected}
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="11" fill="var(--color-accent-music)" />
                <path d="M7 12l3.5 3.5L17 8.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
            {:else}
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
              </svg>
            {/if}
          </span>
        </button>
      {/each}

      {#if !showAll && overflow > 0}
        <button class="show-more" onclick={() => showAll = true}>
          Show {overflow} more…
        </button>
      {/if}

      <!-- All Speakers & TVs -->
      <div class="all-divider"></div>
      <button class="all-btn" onclick={selectAll} aria-label="Play on all speakers">
        <span class="icon-box all-icon-box">
          <LayoutGrid size={18} strokeWidth={1.5} />
        </span>
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

  /* Floating card */
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

  .divider {
    height: 1px; background: rgba(255,255,255,0.07);
    margin: 0 -16px; flex-shrink: 0;
  }

  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--color-text-tertiary);
    opacity: 0.6; margin: 12px 0 6px; flex-shrink: 0;
  }

  /* ── Speaker list ── */
  .speaker-list {
    display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto; scrollbar-width: none;
    flex: 1; padding-bottom: 12px;
  }
  .speaker-list::-webkit-scrollbar { display: none; }

  /* Speaker row */
  .speaker-row {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 14px; border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: none; cursor: pointer;
    width: 100%; text-align: left;
    transition: background 140ms;
    -webkit-tap-highlight-color: transparent;
    margin-bottom: 4px;
  }
  .speaker-row.selected {
    background: rgba(155, 123, 181, 0.15);
  }
  .speaker-row:not(.selected):active {
    background: rgba(255,255,255,0.07);
  }

  /* Icon box */
  .icon-box {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    color: var(--color-text-primary);
    transition: background 140ms, color 140ms;
  }
  .speaker-row.selected .icon-box {
    background: color-mix(in srgb, var(--color-accent-music) 30%, transparent);
    color: var(--color-accent-music);
  }

  /* Name + subtitle */
  .sp-body {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 2px;
  }
  .sp-name {
    font-size: clamp(16px, 1.5vw, 20px); font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sp-sub {
    font-size: clamp(11px, 1vw, 14px); color: var(--color-text-tertiary); opacity: 0.7;
  }

  /* Radio indicator */
  .radio {
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px;
  }

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
    margin: 4px -16px 6px;
    flex-shrink: 0;
  }

  .all-btn {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 14px; border-radius: 14px;
    border: none; background: transparent; cursor: pointer;
    color: var(--color-accent-music);
    font-size: clamp(15px, 1.39vw, 19px); font-weight: 500;
    width: 100%; text-align: left;
    transition: background 140ms;
    -webkit-tap-highlight-color: transparent;
  }
  .all-btn:active { background: rgba(255,255,255,0.04); }

  .all-icon-box {
    background: color-mix(in srgb, var(--color-accent-music) 18%, transparent);
    color: var(--color-accent-music);
  }
</style>
