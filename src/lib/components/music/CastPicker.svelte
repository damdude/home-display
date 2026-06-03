<script lang="ts">
  import { fly, fade }   from 'svelte/transition';
  import { cubicOut }    from 'svelte/easing';
  import { X, Speaker, Tv2, Check, Music2 } from 'lucide-svelte';
  import { musicState }    from '$lib/stores/musicState.svelte.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';

  // ── Allowed speaker display list ────────────────────────────────────────
  // When MA is installed, entities get _2 suffix. We map those to display names.
  // Native (non-MA) entities are also kept as fallback before MA is installed.
  // Entities NOT in this list are hidden from the cast picker.
  //
  // Update this map as your entity IDs solidify after MA install.
  const SPEAKER_DISPLAY: Record<string, string> = {
    'media_player.maindoor_speaker_2': 'Maindoor Speaker',
    'media_player.second_speaker_2':   'Second Speaker',
    'media_player.bbox':               'Apple TV',
    // Fallback for before MA is installed:
    'media_player.maindoor_speaker':   'Maindoor Speaker',
    'media_player.second_speaker':     'Second Speaker',
  };

  // ── Filtered player list ────────────────────────────────────────────────
  let allPlayers = $derived(musicState.players);

  // Keep only explicitly allowed speakers; prefer _2 MA entities over natives
  let speakers = $derived.by(() => {
    const result: Array<ResolvedPlayer & { displayName: string }> = [];
    const seenNames = new Set<string>();

    for (const p of allPlayers) {
      const name = SPEAKER_DISPLAY[p.controlId];
      if (!name) continue;
      if (seenNames.has(name)) continue; // skip duplicate display name (native+MA)
      seenNames.add(name);
      result.push({ ...p, displayName: name });
    }

    // If none matched (MA not yet installed), show all resolved players
    if (!result.length) {
      return allPlayers.map(p => ({
        ...p,
        displayName: p.name,
      }));
    }
    return result;
  });

  let active = $derived(musicState.active);

  // ── Speaker selection ───────────────────────────────────────────────────
  function select(p: ResolvedPlayer) {
    const old = active;
    musicState.setActive(p.controlId);

    if (old && old.state === 'playing' && old.controlId !== p.controlId) {
      if (old.isMaManaged) {
        callHaService('mass', 'transfer_queue', {
          source_player: old.controlId,
          target_player: p.controlId,
        });
      }
      // Non-MA: user has to restart playback; we've just changed the active target
    }
  }

  function deviceIcon(p: ResolvedPlayer & { displayName: string }) {
    // Use TV icon for entities mapped to "Apple TV" or bbox
    return p.controlId === 'media_player.bbox' || p.displayName === 'Apple TV'
      ? Tv2 : Speaker;
  }

  function volPct(p: ResolvedPlayer): string {
    if (p.media.volume == null) return '';
    return `${Math.round(p.media.volume * 100)}%`;
  }
</script>

{#if musicState.castPickerOpen}
  <!-- Scrim -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="scrim"
    transition:fade={{ duration: 220 }}
    onclick={() => musicState.closeCastPicker()}
  ></div>

  <!-- Sheet -->
  <div
    class="sheet"
    transition:fly={{ y: 300, duration: 350, easing: cubicOut }}
    role="dialog"
    aria-label="Play on"
  >
    <!-- Handle -->
    <div class="handle" aria-hidden="true"></div>

    <!-- Mini now-playing header -->
    <div class="np-header">
      {#if active?.media.title}
        <div class="np-art">
          {#if active.media.artwork}
            <img src={active.media.artwork} alt="" class="np-art-img" />
          {:else}
            <div class="np-art-ph"><Music2 size={20} strokeWidth={1.4} /></div>
          {/if}
        </div>
        <div class="np-info">
          <p class="np-title">{active.media.title}</p>
          {#if active.media.artist}
            <p class="np-artist">{active.media.artist}</p>
          {/if}
        </div>
      {:else}
        <p class="np-idle">No active playback</p>
      {/if}

      <button
        class="close-btn"
        onclick={() => musicState.closeCastPicker()}
        aria-label="Close"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>

    <div class="divider"></div>

    <!-- Speaker list -->
    <div class="list">
      {#each speakers as sp (sp.controlId)}
        {@const isActive  = sp.controlId === active?.controlId}
        {@const Icon      = deviceIcon(sp)}
        {@const vol       = volPct(sp)}
        <button
          class="speaker-row"
          class:active={isActive}
          onclick={() => select(sp)}
          aria-pressed={isActive}
          aria-label={sp.displayName}
        >
          <span class="sp-icon"><Icon size={20} strokeWidth={1.5} /></span>
          <span class="sp-info">
            <span class="sp-name">{sp.displayName}</span>
            {#if vol}
              <span class="sp-vol">{vol}</span>
            {/if}
          </span>
          {#if isActive}
            <Check size={18} strokeWidth={2.5} class="sp-check" />
          {/if}
        </button>
      {/each}

      {#if speakers.length === 0}
        <p class="empty">No speakers available</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 120;
    background: rgba(0,0,0,0.5);
  }

  /* Apple-style frosted bottom sheet */
  .sheet {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 121;
    background: rgba(30, 30, 35, 0.96);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border-radius: 24px 24px 0 0;
    border-top: 1px solid rgba(255,255,255,0.08);
    padding: 8px 5vw max(28px, env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 0;
    box-shadow: 0 -4px 32px rgba(0,0,0,0.5);
    max-height: 70vh;
  }

  .handle {
    width: 36px; height: 4px;
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
    margin: 0 auto 14px;
    flex-shrink: 0;
  }

  /* Mini now-playing header */
  .np-header {
    display: flex; align-items: center; gap: 12px;
    padding-bottom: 14px; flex-shrink: 0;
  }

  .np-art {
    width: 48px; height: 48px; border-radius: 8px;
    overflow: hidden; background: var(--color-surface-2); flex-shrink: 0;
  }
  .np-art-img { width: 100%; height: 100%; object-fit: cover; }
  .np-art-ph {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.4;
  }

  .np-info {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 1px;
  }
  .np-title {
    font-size: clamp(14px, 1.25vw, 18px); font-weight: 600;
    color: var(--color-text-primary); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-artist {
    font-size: clamp(12px, 1.04vw, 15px);
    color: var(--color-text-secondary); margin: 0; opacity: 0.72;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .np-idle {
    flex: 1; font-size: clamp(13px, 1.11vw, 16px);
    color: var(--color-text-tertiary); margin: 0; font-style: italic;
  }

  .close-btn {
    width: 30px; height: 30px; border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.08);
    color: var(--color-text-secondary);
    cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }

  .divider {
    height: 1px; background: rgba(255,255,255,0.07);
    margin: 0 0 10px; flex-shrink: 0;
  }

  /* Speaker list */
  .list {
    display: flex; flex-direction: column; gap: 4px;
    overflow-y: auto; scrollbar-width: none;
  }
  .list::-webkit-scrollbar { display: none; }

  .speaker-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 14px;
    background: transparent; border: none; cursor: pointer;
    text-align: left; width: 100%;
    transition: background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .speaker-row.active {
    background: rgba(255,255,255,0.06);
  }
  .speaker-row:not(.active):active { background: rgba(255,255,255,0.04); }

  .sp-icon { color: var(--color-text-secondary); flex-shrink: 0; display: flex; }
  .speaker-row.active .sp-icon { color: var(--color-accent-music); }

  .sp-info {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 1px;
  }
  .sp-name {
    font-size: clamp(15px, 1.39vw, 20px); font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sp-vol {
    font-size: clamp(11px, 0.97vw, 14px); color: var(--color-text-tertiary);
    opacity: 0.65;
  }

  /* Check icon — accent music when active */
  .speaker-row :global(.sp-check) {
    color: var(--color-accent-music); flex-shrink: 0;
  }

  .empty {
    font-size: clamp(13px, 1.11vw, 16px);
    color: var(--color-text-tertiary); text-align: center;
    padding: 1rem 0; margin: 0; opacity: 0.6;
  }
</style>
