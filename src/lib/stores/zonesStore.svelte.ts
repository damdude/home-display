/**
 * Client-side zones store.
 *
 * Consumes the /api/zones SSE stream and exposes reactive zone/floor data.
 * Types are defined here (matching server zones.ts) so no server module is
 * imported on the client.
 */
import { browser } from '$app/environment';

// ── Shared types (mirror of src/lib/server/ha/zones.ts) ──────────────────────

export interface ZoneEntity {
  entity_id: string;
  domain:    string;
  name:      string;
}

export interface ZoneData {
  areaId:   string;
  name:     string;
  floor_id: string | null;
  entities: ZoneEntity[];
}

export interface FloorData {
  floor_id: string;
  name:     string;
  level:    number;
  zones:    ZoneData[];
}

export interface ZoneRegistry {
  floors:     FloorData[];
  unassigned: ZoneData | null;
}

// ── Config ────────────────────────────────────────────────────────────────────

const HIDDEN_AREA_IDS = new Set(['garage', 'nritya_kala_kendra']);
const FLOOR_ORDER     = ['ground_floor', '1st_floor'];

// ── Reactive state ────────────────────────────────────────────────────────────

let _registry = $state<ZoneRegistry | null>(null);
let _loading  = $state(true);

function filteredZones(zones: ZoneData[]): ZoneData[] {
  return zones.filter(z => !HIDDEN_AREA_IDS.has(z.areaId) && z.entities.length > 0);
}

export const zonesStore = {
  get loading():  boolean            { return _loading; },
  get registry(): ZoneRegistry|null  { return _registry; },

  /** Real floors, sorted by FLOOR_ORDER then level, empty zones stripped. */
  get floors(): FloorData[] {
    if (!_registry) return [];
    return _registry.floors
      .map(f => ({ ...f, zones: filteredZones(f.zones) }))
      .filter(f => f.zones.length > 0)
      .sort((a, b) => {
        const ai = FLOOR_ORDER.indexOf(a.floor_id);
        const bi = FLOOR_ORDER.indexOf(b.floor_id);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return  1;
        return a.level - b.level;
      });
  },

  get unassigned(): ZoneData | null {
    const u = _registry?.unassigned ?? null;
    return u && u.entities.length > 0 ? u : null;
  },
};

// ── SSE stream ────────────────────────────────────────────────────────────────

export function startZonesStream(): () => void {
  if (!browser) return () => {};

  const es = new EventSource('/api/zones');

  es.onmessage = (e: MessageEvent<string>) => {
    try {
      const msg = JSON.parse(e.data) as { type: string; data?: ZoneRegistry };
      if (msg.type === 'zones' && msg.data) {
        _registry = msg.data;
        _loading  = false;
      }
    } catch (err) {
      console.error('[Zones store] Failed to parse SSE message:', err);
    }
  };

  es.onerror = () => {
    console.warn('[Zones store] SSE connection error — will retry');
  };

  return () => es.close();
}
