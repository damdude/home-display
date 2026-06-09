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

function pickActive(players: ResolvedPlayer[]): ResolvedPlayer | null {
  if (!players.length) return null;

  // Honour explicit selection if still alive
  if (_selectedId) {
    const sel = players.find(p => p.controlId === _selectedId);
    if (sel) return sel;
    // Selected entity gone — clear selection and fall through
    _selectedId = null;
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
  get players(): ResolvedPlayer[] {
    return resolveMediaPlayers(haStore.entities);
  },

  get active(): ResolvedPlayer | null {
    return pickActive(this.players);
  },

  get castPickerOpen(): boolean {
    return _castPickerOpen;
  },

  setActive(controlId: string): void {
    _selectedId     = controlId;
    _castPickerOpen = false;
  },

  openCastPicker():  void { _castPickerOpen = true;  },
  closeCastPicker(): void { _castPickerOpen = false; },
};
