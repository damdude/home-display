<script lang="ts">
  import { X }          from 'lucide-svelte';
  import { fade, fly }  from 'svelte/transition';
  import { cubicOut }   from 'svelte/easing';
  import SpeakerTile    from './SpeakerTile.svelte';
  import { musicState } from '$lib/stores/musicState.svelte.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  let players  = $derived(musicState.players);
  let active   = $derived(musicState.active);

  function select(controlId: string) {
    const oldActive = active;
    musicState.setActive(controlId);

    // If music was playing, attempt to transfer to newly selected speaker
    if (oldActive && oldActive.state === 'playing' && oldActive.controlId !== controlId) {
      // MA transfer: mass.transfer_queue — works when both are MA-managed
      // Fallback: simply play the same media on the new speaker
      if (oldActive.isMaManaged) {
        callHaService('mass', 'transfer_queue', {
          source_player: oldActive.controlId,
          target_player: controlId,
        });
      }
      // For native Cast, there's no simple cross-device transfer without MA,
      // so we just switch the control target; user can restart playback.
    }
  }
</script>

{#if musicState.castPickerOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="backdrop"
    transition:fade={{ duration: 200 }}
    onclick={() => musicState.closeCastPicker()}
  ></div>

  <!-- Bottom sheet -->
  <div
    class="sheet"
    transition:fly={{ y: 80, duration: 300, easing: cubicOut }}
    role="dialog"
    aria-label="Choose speaker"
  >
    <!-- Handle -->
    <div class="handle" aria-hidden="true"></div>

    <!-- Header -->
    <div class="header">
      <h3 class="title">Play on</h3>
      <button class="close-btn" onclick={() => musicState.closeCastPicker()} aria-label="Close">
        <X size={18} strokeWidth={2} />
      </button>
    </div>

    <!-- Speaker list -->
    <div class="list">
      {#each players as p (p.controlId)}
        <SpeakerTile
          player={p}
          selected={p.controlId === active?.controlId}
          onclick={() => select(p.controlId)}
        />
      {/each}
      {#if players.length === 0}
        <p class="empty">No speakers found</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; z-index: 120;
    background: rgba(0,0,0,0.55);
  }

  .sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    z-index: 121;
    background: var(--color-surface-1);
    border-top: 1px solid var(--color-border);
    border-radius: 24px 24px 0 0;
    padding: 8px 5vw 32px;
    max-height: 65vh;
    display: flex; flex-direction: column; gap: 0;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.4);
  }

  .handle {
    width: 40px; height: 4px;
    background: var(--color-border);
    border-radius: 999px;
    margin: 0 auto 12px;
    flex-shrink: 0;
  }

  .header {
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; margin-bottom: 16px;
  }

  .title {
    font-size: clamp(18px, 1.67vw, 24px);
    font-weight: 600; margin: 0; letter-spacing: -0.01em;
    color: var(--color-text-primary);
  }

  .close-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: none; background: var(--color-surface-2);
    color: var(--color-text-secondary);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }

  .list {
    display: flex; flex-direction: column; gap: 8px;
    overflow-y: auto; scrollbar-width: none;
  }
  .list::-webkit-scrollbar { display: none; }

  .empty {
    font-size: clamp(14px, 1.25vw, 18px);
    color: var(--color-text-tertiary); opacity: 0.6;
    text-align: center; padding: 1rem 0; margin: 0;
  }
</style>
