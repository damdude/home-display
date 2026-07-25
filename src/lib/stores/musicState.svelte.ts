/**
 * Reactive music state — derived from haStore.entities via entity resolution.
 *
 * Exposes:
 *   musicState.players      — all resolved speakers, sorted by playback state
 *   musicState.active       — the "Now Playing" speaker
 *   musicState.setActive()  — user explicitly picks a speaker
 *   musicState.castPickerOpen / openCastPicker / closeCastPicker
 *
 * Active-player priority:
 *   1. Explicitly selected via setActive() (persists until user picks again)
 *   2. Speaker currently in "playing" state with freshest metadata
 *   3. Speaker in "paused" state (first match)
 *   4. null — never auto-selects idle/off speakers
 */

import { haStore } from './ha.svelte.js';
import { resolveMediaPlayers, type ResolvedPlayer } from '$lib/music/playerResolution.js';

let _selectedId     = $state<string | null>(null);
let _castPickerOpen = $state(false);

// Memoized: recomputes only when the entities it actually reads change.
const _players = $derived(resolveMediaPlayers(haStore.entities));
const _active  = $derived(pickActive(_players));

function pickActive(players: ResolvedPlayer[]): ResolvedPlayer | null {
  if (!players.length) return null;

  // Honour explicit selection if still alive. Note: a $derived must be
  // side-effect free, so we only READ _selectedId here — we never clear it.
  // If the selected player returns, the selection is honoured again.
  if (_selectedId) {
    const sel = players.find(p => p.controlId === _selectedId);
    if (sel) return sel;
  }

  // Auto-select only playing or paused — never idle/off/unavailable
  const playing = players
    .filter(p => p.state === 'playing')
    .sort((a, b) => (b.media.positionUpdatedAt ?? 0) - (a.media.positionUpdatedAt ?? 0));
  if (playing.length) return playing[0];

  const paused = players.filter(p => p.state === 'paused');
  if (paused.length) return paused[0];

  // Nothing playing or paused — return null so UI shows "Nothing playing"
  return null;
}

export const musicState = {
  get players(): ResolvedPlayer[]      { return _players; },
  get active():  ResolvedPlayer | null { return _active;  },
  get castPickerOpen(): boolean        { return _castPickerOpen; },

  setActive(controlId: string): void {
    _selectedId     = controlId;
    _castPickerOpen = false;
  },

  openCastPicker():  void { _castPickerOpen = true;  },
  closeCastPicker(): void { _castPickerOpen = false; },
};
