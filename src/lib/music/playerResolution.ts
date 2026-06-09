/**
 * Media-player entity resolution.
 *
 * Converts raw HassEntities into a clean list of logical "speakers" by
 * grouping every media_player.* entity that shares the same friendly_name.
 *
 * Within each group:
 *  • Control entity   — where service calls (play/pause/volume/seek) are sent.
 *                       Preference: Music-Assistant-managed (has mass_player_type)
 *                       over native HA Cast / Apple TV entities.
 *  • State entity     — where track metadata (title, artwork, position) is read.
 *                       Chosen as the group member in "playing" state with the
 *                       freshest media_position_updated_at.
 *  • AirPlay-receiver — app_id starts with "com.apple.TV".  Usable as state
 *                       source but never as a control target.
 *
 * Capabilities are decoded from the control entity's supported_features bitmask
 * and exposed as a flat PlayerCaps object so components never touch raw flags.
 */

import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';

// ── HA MediaPlayerEntityFeature bitmask ─────────────────────────────────────
export const FEAT = {
  PAUSE:          1,
  SEEK:           2,
  VOLUME_SET:     4,
  VOLUME_MUTE:    8,
  PREVIOUS:      16,
  NEXT:          32,
  PLAY_MEDIA:    64,
  VOLUME_STEP:  128,
  STOP:        4096,
  PLAY:       16384,
  SHUFFLE_SET: 32768,
  BROWSE_MEDIA: 131072,
  REPEAT_SET:  262144,
  GROUP_MEMBERS: 524288,
} as const;

export function hasFeat(flags: number, f: number): boolean {
  return (flags & f) !== 0;
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface PlayerCaps {
  canPlay:     boolean;
  canPause:    boolean;
  canStop:     boolean;
  canSeek:     boolean;
  canPrevious: boolean;
  canNext:     boolean;
  canVolume:   boolean;
  canMute:     boolean;
  canStep:     boolean;
  canShuffle:  boolean;
  canRepeat:   boolean;
  canBrowse:   boolean;
  canGroup:    boolean;
}

export interface MediaMeta {
  title:             string | null;
  artist:            string | null;
  album:             string | null;
  artwork:           string | null;  // absolute CDN URL or /api/artwork?path=…
  duration:          number | null;  // seconds
  position:          number | null;  // seconds at positionUpdatedAt
  positionUpdatedAt: number | null;  // Unix ms
  appName:           string | null;
  appId:             string | null;
  shuffleOn:         boolean;
  repeat:            'off' | 'one' | 'all';
  volume:            number | null;  // 0.0 – 1.0
  muted:             boolean;
}

export interface ResolvedPlayer {
  name:        string;
  controlId:   string;
  stateId:     string;
  isMaManaged: boolean;
  caps:        PlayerCaps;
  state:       string;
  media:       MediaMeta;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isAirPlayRx(ent: HassEntity): boolean {
  return String(ent.attributes?.app_id ?? '').startsWith('com.apple.TV');
}

function isMa(ent: HassEntity): boolean {
  return ent.attributes?.mass_player_type != null;
}

function posAge(ent: HassEntity): number {
  const s = ent.attributes?.media_position_updated_at;
  return s ? new Date(String(s)).getTime() : 0;
}

function decodeCaps(sf: number): PlayerCaps {
  return {
    canPlay:     hasFeat(sf, FEAT.PLAY),
    canPause:    hasFeat(sf, FEAT.PAUSE),
    canStop:     hasFeat(sf, FEAT.STOP),
    canSeek:     hasFeat(sf, FEAT.SEEK),
    canPrevious: hasFeat(sf, FEAT.PREVIOUS),
    canNext:     hasFeat(sf, FEAT.NEXT),
    canVolume:   hasFeat(sf, FEAT.VOLUME_SET),
    canMute:     hasFeat(sf, FEAT.VOLUME_MUTE),
    canStep:     hasFeat(sf, FEAT.VOLUME_STEP),
    canShuffle:  hasFeat(sf, FEAT.SHUFFLE_SET),
    canRepeat:   hasFeat(sf, FEAT.REPEAT_SET),
    canBrowse:   hasFeat(sf, FEAT.BROWSE_MEDIA),
    canGroup:    hasFeat(sf, FEAT.GROUP_MEMBERS),
  };
}

export function nullCaps(): PlayerCaps {
  return {
    canPlay: false, canPause: false, canStop: false, canSeek: false,
    canPrevious: false, canNext: false, canVolume: false, canMute: false,
    canStep: false, canShuffle: false, canRepeat: false, canBrowse: false,
    canGroup: false,
  };
}

function resolveArtwork(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw);
  return s.startsWith('http') ? s : `/api/artwork?path=${encodeURIComponent(s)}`;
}

function extractMeta(stateEnt: HassEntity, ctrlEnt: HassEntity): MediaMeta {
  const s = stateEnt.attributes ?? {};
  const c = ctrlEnt.attributes  ?? {};
  return {
    title:    (s.media_title      ?? null) as string | null,
    artist:   (s.media_artist     ?? null) as string | null,
    album:    (s.media_album_name ?? null) as string | null,
    artwork:  resolveArtwork((s.entity_picture ?? c.entity_picture) as string | null),
    duration: (s.media_duration   ?? null) as number | null,
    position: (s.media_position   ?? null) as number | null,
    positionUpdatedAt: s.media_position_updated_at
      ? new Date(String(s.media_position_updated_at)).getTime() : null,
    appName: (s.app_name ?? c.app_name ?? null) as string | null,
    appId:   (s.app_id   ?? c.app_id   ?? null) as string | null,
    shuffleOn: !!(c.shuffle),
    repeat:    (['off', 'one', 'all'].includes(String(c.repeat))
      ? c.repeat : 'off') as 'off' | 'one' | 'all',
    volume: (c.volume_level    ?? null) as number | null,
    muted:  !!(c.is_volume_muted),
  };
}

const STATE_RANK: Record<string, number> = {
  playing: 0, paused: 1, idle: 2, standby: 3, on: 4, off: 5, unavailable: 6,
};

// ── Main resolver ─────────────────────────────────────────────────────────────

export function resolveMediaPlayers(entities: HassEntities): ResolvedPlayer[] {
  const mps = Object.entries(entities)
    .filter(([id]) => id.startsWith('media_player.'));

  // Group by friendly_name
  const groups = new Map<string, Array<[string, HassEntity]>>();
  for (const [id, ent] of mps) {
    const name = String(ent.attributes?.friendly_name ?? id);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push([id, ent]);
  }

  const result: ResolvedPlayer[] = [];

  for (const [name, members] of groups) {
    const airplay      = members.filter(([, e]) =>  isAirPlayRx(e));
    const controllable = members.filter(([, e]) => !isAirPlayRx(e));
    if (!controllable.length) continue;

    // Control entity: MA-managed preferred
    const [controlId, controlEnt] =
      controllable.find(([, e]) => isMa(e)) ?? controllable[0];

    // State entity: playing + freshest position timestamp
    const playingFresh = [...controllable, ...airplay]
      .filter(([, e]) => e.state === 'playing')
      .sort(([, a], [, b]) => posAge(b) - posAge(a));
    const [stateId, stateEnt] = playingFresh[0] ?? [controlId, controlEnt];

    const sf = Number(controlEnt.attributes?.supported_features ?? 0);
    result.push({
      name, controlId, stateId,
      // NOTE: stateId is for reading metadata/state only (the group member
      // currently in 'playing' state with the freshest position timestamp).
      // ALL service calls (play/pause/seek/volume/skip) MUST use controlId.
      // controlId is always the MA-managed entity; MA routes commands to the
      // underlying Cast session correctly regardless of how it was started.
      isMaManaged: isMa(controlEnt),
      caps:  decodeCaps(sf),
      state: stateEnt.state !== 'unavailable' ? stateEnt.state : controlEnt.state,
      media: extractMeta(stateEnt, controlEnt),
    });
  }

  return result.sort(
    (a, b) => (STATE_RANK[a.state] ?? 9) - (STATE_RANK[b.state] ?? 9),
  );
}
