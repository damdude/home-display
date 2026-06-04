/**
 * Server-only zone/area/floor registry.
 *
 * Opens a short-lived WebSocket query session to HA, fetches all four
 * registries (floor → area → device → entity), builds a ZoneRegistry,
 * and broadcasts to SSE subscribers.  Refreshes every 10 minutes.
 *
 * Skip rules:
 *   - disabled_by !== null
 *   - entity_category is 'diagnostic' or 'config'
 *   - domain in: button, select, scene, automation, number, text (+ helpers)
 *   - entities with no area → bucketed into __unassigned__
 */

import { createConnection, createLongLivedTokenAuth } from 'home-assistant-js-websocket';
import { env } from '$env/dynamic/private';

// ── Public types ──────────────────────────────────────────────────────────────

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
  floors:     FloorData[];     // sorted by level ascending
  unassigned: ZoneData | null; // entities with no area
}

// ── Skip rules ────────────────────────────────────────────────────────────────

const SKIP_DOMAINS = new Set([
  'button', 'select', 'scene', 'automation', 'number', 'text',
  'input_boolean', 'input_number', 'input_text', 'input_select',
  'input_datetime', 'script', 'group', 'sun', 'zone', 'person',
  'device_tracker', 'update',
]);

const SKIP_CATEGORIES = new Set(['diagnostic', 'config']);

// ── State ─────────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 10 * 60 * 1_000;
const INITIAL_DELAY_MS = 8_000;

let cachedRegistry: ZoneRegistry = { floors: [], unassigned: null };
let started = false;
const subscribers = new Set<(reg: ZoneRegistry) => void>();

// ── Subscriber API ────────────────────────────────────────────────────────────

export function subscribeZones(cb: (reg: ZoneRegistry) => void): () => void {
  subscribers.add(cb);
  const { floors, unassigned } = cachedRegistry;
  if (floors.length > 0 || unassigned) cb(cachedRegistry);
  return () => subscribers.delete(cb);
}

export function getZoneRegistry(): ZoneRegistry {
  return cachedRegistry;
}

function broadcast(reg: ZoneRegistry) {
  cachedRegistry = reg;
  for (const cb of subscribers) {
    try { cb(reg); } catch (e) { console.error('[Zones] subscriber error:', e); }
  }
}

// ── HA registry types ────────────────────────────────────────────────────────

interface FloorEntry  { floor_id: string; name: string; level: number; icon?: string | null; }
interface AreaEntry   { area_id: string; name: string; floor_id?: string | null; icon?: string | null; }
interface DeviceEntry { id: string; area_id?: string | null; }
interface EntityEntry {
  entity_id:        string;
  area_id?:         string | null;
  device_id?:       string | null;
  disabled_by?:     string | null;
  entity_category?: string | null;
  name?:            string | null;
  original_name?:   string | null;
}

// ── Registry fetch ────────────────────────────────────────────────────────────

async function fetchZoneRegistry(): Promise<void> {
  const haUrl   = env.HA_URL;
  const haToken = env.HA_TOKEN;
  if (!haUrl || !haToken) { console.error('[Zones] HA_URL / HA_TOKEN not set'); return; }

  let conn: Awaited<ReturnType<typeof createConnection>> | null = null;
  try {
    const auth = createLongLivedTokenAuth(haUrl, haToken);
    conn = await createConnection({ auth });

    const [floorList, areaList, deviceList, entityList] = await Promise.all([
      conn.sendMessagePromise({ type: 'config/floor_registry/list' })  as Promise<FloorEntry[]>,
      conn.sendMessagePromise({ type: 'config/area_registry/list' })   as Promise<AreaEntry[]>,
      conn.sendMessagePromise({ type: 'config/device_registry/list' }) as Promise<DeviceEntry[]>,
      conn.sendMessagePromise({ type: 'config/entity_registry/list' }) as Promise<EntityEntry[]>,
    ]);

    // Lookup maps
    const floorById: Record<string, FloorEntry> = {};
    for (const f of floorList) floorById[f.floor_id] = f;

    const areaById: Record<string, AreaEntry> = {};
    for (const a of areaList) areaById[a.area_id] = a;

    const deviceAreaMap: Record<string, string> = {};
    for (const d of deviceList) { if (d.area_id) deviceAreaMap[d.id] = d.area_id; }

    // Build zone buckets keyed by area_id (or __unassigned__)
    const zoneMap: Record<string, ZoneData> = {};

    for (const e of entityList) {
      if (e.disabled_by !== null && e.disabled_by !== undefined) continue;
      if (e.entity_category && SKIP_CATEGORIES.has(e.entity_category)) continue;

      const domain = e.entity_id.split('.')[0];
      if (SKIP_DOMAINS.has(domain)) continue;

      const effectiveAreaId = e.area_id ?? deviceAreaMap[e.device_id ?? ''] ?? null;
      const bucketId = effectiveAreaId ?? '__unassigned__';

      if (!zoneMap[bucketId]) {
        if (effectiveAreaId) {
          const area = areaById[effectiveAreaId];
          if (!area) continue;
          zoneMap[bucketId] = {
            areaId:   effectiveAreaId,
            name:     area.name,
            floor_id: area.floor_id ?? null,
            entities: [],
          };
        } else {
          zoneMap[bucketId] = {
            areaId:   '__unassigned__',
            name:     'Other Devices',
            floor_id: null,
            entities: [],
          };
        }
      }

      zoneMap[bucketId].entities.push({
        entity_id: e.entity_id,
        domain,
        name: e.name ?? e.original_name ?? e.entity_id,
      });
    }

    // Separate unassigned
    const unassigned = zoneMap['__unassigned__'] ?? null;
    delete zoneMap['__unassigned__'];

    // Group zones by floor
    const floorZoneMap: Record<string, ZoneData[]> = {};
    const noFloorZones: ZoneData[] = [];

    for (const zone of Object.values(zoneMap)) {
      if (zone.floor_id && floorById[zone.floor_id]) {
        (floorZoneMap[zone.floor_id] ??= []).push(zone);
      } else {
        noFloorZones.push(zone);
      }
    }

    // Build sorted floor list
    const floors: FloorData[] = floorList
      .filter(f => (floorZoneMap[f.floor_id]?.length ?? 0) > 0)
      .sort((a, b) => a.level - b.level)
      .map(f => ({ floor_id: f.floor_id, name: f.name, level: f.level, zones: floorZoneMap[f.floor_id] ?? [] }));

    // Synthetic "Other" floor for no-floor zones
    if (noFloorZones.length > 0) {
      floors.push({ floor_id: '__other__', name: 'Other', level: 999, zones: noFloorZones });
    }

    const totalZones = floors.reduce((n, f) => n + f.zones.length, 0);
    console.log(`[Zones] Refreshed: ${floors.length} floors, ${totalZones} zones`);
    broadcast({ floors, unassigned });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('not connected') && !msg.includes('Handshake')) {
      console.error('[Zones] Registry fetch failed:', msg);
    }
  } finally {
    conn?.close();
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export function startZoneRefresh(): void {
  if (started) return;
  started = true;
  setTimeout(() => void fetchZoneRegistry(), INITIAL_DELAY_MS);
  setInterval(() => void fetchZoneRegistry(), REFRESH_INTERVAL);
  console.log('[Zones] Registry refresh scheduled (10 min)');
}
