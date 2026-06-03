<script lang="ts">
  /**
   * Shared Apple-style cast picker bottom sheet.
   * Used by both MediaNowPlaying (Home tab) and music/+page.svelte (Music tab).
   *
   * Props:
   *   open    — whether the sheet is visible
   *   onClose — called when scrim tapped, drag-down, or X button pressed
   */
  import { fly, fade }   from 'svelte/transition';
  import { cubicOut }    from 'svelte/easing';
  import { Speaker, Tv2, Check, Music2 } from 'lucide-svelte';
  import { musicState }    from '$lib/stores/musicState.svelte.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';

  interface Props {
    open:    boolean;
    onClose: () => void;
  }
  let { open, onClose }: Props = $props();

  // ── Speaker allowlist — shown in this exact order ─────────────────────────
  // Update keys when MA entities solidify after install (_2 suffix = MA-managed).
  // Fallback keys (without _2) keep the picker usable before MA is installed.
  const ALLOWLIST: Array<{ id: string; label: string; icon: typeof Speaker }> = [
    { id: 'media_player.maindoor_speaker_2', label: 'Maindoor Speaker', icon: Speaker },
    { id: 'media_player.second_speaker_2',   label: 'Second Speaker',   icon: Speaker },
    { id: 'media_player.bbox',               label: 'Apple TV',         icon: Tv2     },
    // Fallbacks — used before MA install:
    { id: 'media_player.maindoor_speaker',   label: 'Maindoor Speaker', icon: Speaker },
    { id: 'media_player.second_speaker',     label: 'Second Speaker',   icon: Speaker },
  ];

  const MAX_VISIBLE = 4; // "Show More" appears beyond this threshold

  let showAll = $state(false);

  // Resolve each allowlist entry against live player data, deduplicating by label
  let speakers = $derived.by(() => {
    const allPlayers = musicState.players;
    const seen = new Set<string>();
    const result: Array<{
      entry: typeof ALLOWLIST[0];
      player: ResolvedPlayer | undefined;
    }> = [];

    for (const entry of ALLOWLIST) {
      if (seen.has(entry.label)) continue; // prefer higher-priority (_2) entry
      const player = allPlayers.find(p => p.controlId === entry.id);
      if (player || allPlayers.length === 0) {
        seen.add(entry.label);
        result.push({ entry, player });
      }
    }

    // If nothing matched allowlist at all, fall back to all players
    if (!result.length) {
      return allPlayers.map(p => ({
        entry: { id: p.controlId, label: p.name, icon: Speaker as typeof Speaker },
        player: p,
      }));
    }
    return result;
  });

  let visible = $derived(showAll ? speakers : speakers.slice(0, MAX_VISIBLE));
  let overflow = $derived(speakers.length - MAX_VISIBLE);

  let active = $derived(musicState.active);

  function select(controlId: string) {
    callHaService('media_player', 'media_play', { entity_id: controlId });
    musicState.setActive(controlId);
    onClose();
  }

  function volText(p: ResolvedPlayer | undefined): string {
    if (!p) return '';
    if (p.state === 'off')    return 'Off';
    if (p.state === 'idle')   return 'Idle';
    if (p.media.volume != null) return `${Math.round(p.media.volume * 100)}%`;
    return '';
  }

  function isActive(id: string): boolean {
    return active?.controlId === id;
  }
</script>

{#if open}
  <!-- Scrim -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="scrim"
    transition:fade={{ duration: 220 }}
    onclick={onClose}
  ></div>

  <!-- Sheet -->
  <div
    class="sheet"
    role="dialog"
    aria-label="Play on"
    aria-modal="true"
    transition:fly={{ y: 400, duration: 380, easing: cubicOut }}
  >
    <!-- Drag handle -->
    <div class="handle" aria-hidden="true"></div>

    <!-- Mini now-playing header -->
    <div class="np-row">
      {#if active?.media.title}
        <div class="np-art">
          {#if active.media.artwork}
            <img src={active.media.artwork} alt="" class="np-art-img" />
          {:else}
            <div class="np-art-ph"><Music2 size={22} strokeWidth={1.3} /></div>
          {/if}
        </div>
        <div class="np-text">
          <p class="np-title">{active.media.title}</p>
          {#if active.media.artist}
            <p class="np-artist">{active.media.artist}</p>
          {/if}
        </div>
        <!-- Source badge pill inline -->
        {#if active.media.appName}
          <span class="np-source">{active.media.appName}</span>
        {/if}
      {:else}
        <p class="np-idle">No active playback</p>
      {/if}
    </div>

    <div class="divider"></div>

    <!-- Section label -->
    <p class="section-label">Listening On</p>

    <!-- Speaker rows -->
    <div class="speaker-list">
      {#each visible as { entry, player } (entry.id)}
        {@const active_ = isActive(entry.id)}
        <button
          class="speaker-row"
          class:active={active_}
          onclick={() => select(entry.id)}
          aria-pressed={active_}
          aria-label={entry.label}
        >
          <span class="sp-icon">
            <entry.icon size={20} strokeWidth={1.5} />
          </span>
          <span class="sp-body">
            <span class="sp-name">{entry.label}</span>
            {#if volText(player)}
              <span class="sp-sub">{volText(player)}</span>
            {/if}
          </span>
          {#if active_}
            <Check size={18} strokeWidth={2.5} color="var(--color-accent-music)" />
          {/if}
        </button>
      {/each}

      {#if !showAll && overflow > 0}
        <button class="show-more" onclick={() => showAll = true}>
          Show {overflow} more
        </button>
      {/if}
    </div>

    <!-- Safe-area bottom spacer -->
    <div class="safe-bottom"></div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 120;
    background: rgba(0, 0, 0, 0.55);
  }

  /* Apple frosted-glass bottom sheet */
  .sheet {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 121;
    background: rgba(28, 28, 32, 0.97);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border-radius: 20px 20px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    padding: 8px 5vw 0;
    max-height: 70vh;
    display: flex; flex-direction: column;
    box-shadow: 0 -4px 40px rgba(0, 0, 0, 0.55);
    overflow: hidden;
  }

  /* Handle pill */
  .handle {
    width: 40px; height: 4px;
    background: var(--color-border);
    border-radius: 999px;
    margin: 0 auto 16px;
    flex-shrink: 0;
  }

  /* Mini now-playing row */
  .np-row {
    display: flex; align-items: center; gap: 12px;
    padding-bottom: 14px; flex-shrink: 0;
    min-height: 56px;
  }

  .np-art {
    width: 48px; height: 48px; border-radius: 10px;
    overflow: hidden; background: var(--color-surface-2);
    flex-shrink: 0;
  }
  .np-art-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .np-art-ph {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.35;
  }

  .np-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .np-title {
    font-size: clamp(14px, 1.3vw, 18px); font-weight: 600;
    color: var(--color-text-primary); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-artist {
    font-size: clamp(12px, 1.04vw, 15px); color: var(--color-text-tertiary);
    margin: 0; opacity: 0.75;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-idle {
    flex: 1; font-size: clamp(13px, 1.11vw, 16px);
    color: var(--color-text-tertiary); margin: 0;
    font-style: italic; text-align: center;
  }
  .np-source {
    font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
    padding: 2px 8px; border-radius: 999px;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.7);
    flex-shrink: 0; white-space: nowrap;
  }

  .divider { height: 1px; background: rgba(255,255,255,0.07); margin: 0 0 10px; flex-shrink: 0; }

  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--color-text-tertiary);
    opacity: 0.65; margin: 0 0 8px; flex-shrink: 0;
  }

  /* Speaker list */
  .speaker-list {
    display: flex; flex-direction: column; gap: 3px;
    overflow-y: auto; scrollbar-width: none;
    flex: 1;
  }
  .speaker-list::-webkit-scrollbar { display: none; }

  .speaker-row {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px; border-radius: 14px;
    background: transparent; border: none; cursor: pointer;
    text-align: left; width: 100%;
    transition: background 140ms;
    -webkit-tap-highlight-color: transparent;
  }
  .speaker-row.active { background: var(--color-surface-2); }
  .speaker-row:not(.active):active { background: var(--color-surface-1); }

  .sp-icon { color: var(--color-text-secondary); flex-shrink: 0; display: flex; align-items: center; }
  .speaker-row.active .sp-icon { color: var(--color-accent-music); }

  .sp-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .sp-name {
    font-size: clamp(15px, 1.39vw, 19px); font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sp-sub {
    font-size: clamp(12px, 1.04vw, 15px); color: var(--color-text-tertiary); opacity: 0.7;
  }

  .show-more {
    border: none; background: none; cursor: pointer;
    font-size: clamp(13px, 1.11vw, 16px);
    color: var(--color-accent-music); opacity: 0.8;
    padding: 10px 16px; text-align: left;
    -webkit-tap-highlight-color: transparent;
  }

  /* Bottom safe area */
  .safe-bottom {
    height: max(env(safe-area-inset-bottom, 0px), 16px);
    flex-shrink: 0;
  }
</style>
