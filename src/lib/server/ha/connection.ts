/**
 * Server-only HA WebSocket singleton.
 *
 * One connection shared across all browser SSE clients. N clients subscribe;
 * a single HA WebSocket feeds them all. HA_TOKEN never leaves this module.
 *
 * Reconnection: on disconnect, exponential backoff (1 s → 2 → 4 → … → 30 s).
 * Broadcast: every subscriber receives snapshot on first connect, then patches
 * for individual entity changes, forecast updates, and status changes.
 */
import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
  type HassEntities,
  type HassEntity,
} from 'home-assistant-js-websocket';
import { env } from '$env/dynamic/private';
import type { WeatherForecastDay, CalendarEvent } from '$lib/data/placeholder.js';

export type { CalendarEvent };

// ── Public event union ────────────────────────────────────────────────────────

export type HaEvent =
  | { type: 'snapshot'; entities: HassEntities }
  | { type: 'patch'; entityId: string; state: HassEntity }
  | { type: 'forecast'; data: WeatherForecastDay[] }
  | { type: 'calendar'; events: CalendarEvent[]; overflow: number }
  | { type: 'config'; locationName: string }
  | { type: 'status'; connected: boolean };

// ── Singleton state ───────────────────────────────────────────────────────────

let conn: Connection | null = null;
let isConnected = false;
let initCalled = false;
let currentEntities: HassEntities = {};
let cachedForecast: WeatherForecastDay[] = [];
let cachedCalendarEvents: CalendarEvent[] = [];
let cachedCalendarOverflow = 0;
let cachedLocationName = '';

// Runtime credential override — set by reconnectWithCredentials().
// When present, these take priority over env.HA_URL / env.HA_TOKEN.
let overrideUrl:   string | null = null;
let overrideToken: string | null = null;

const subscribers = new Set<(event: HaEvent) => void>();

// ── Reconnect backoff ─────────────────────────────────────────────────────────

let reconnectDelay = 1_000; // ms; doubles each attempt up to MAX
const MAX_RECONNECT = 30_000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ── Subscriber API ────────────────────────────────────────────────────────────

/**
 * Subscribe to HA events. Returns an unsubscribe function.
 * If the server already has a snapshot, the callback receives it immediately.
 * Triggers lazy connection init on first subscriber.
 */
export function subscribe(cb: (event: HaEvent) => void): () => void {
  subscribers.add(cb);

  // Deliver current state immediately so new SSE clients don't wait
  if (isConnected && Object.keys(currentEntities).length > 0) {
    cb({ type: 'snapshot', entities: currentEntities });
    if (cachedForecast.length > 0) {
      cb({ type: 'forecast', data: cachedForecast });
    }
    if (cachedCalendarEvents.length > 0 || cachedCalendarOverflow > 0) {
      cb({ type: 'calendar', events: cachedCalendarEvents, overflow: cachedCalendarOverflow });
    }
    if (cachedLocationName) {
      cb({ type: 'config', locationName: cachedLocationName });
    }
  } else {
    cb({ type: 'status', connected: isConnected });
  }

  // Lazy init — no-op after first call
  startConnection();

  return () => subscribers.delete(cb);
}

function broadcast(event: HaEvent): void {
  for (const cb of subscribers) {
    try { cb(event); } catch (e) {
      console.error('[HA] subscriber error:', e);
    }
  }
}

// ── Forecast cache (written by forecast.ts) ───────────────────────────────────

export function setCachedForecast(data: WeatherForecastDay[]): void {
  cachedForecast = data;
  broadcast({ type: 'forecast', data });
}

export function getCachedForecast(): WeatherForecastDay[] {
  return cachedForecast;
}

// ── Calendar cache (written by calendar.ts) ───────────────────────────────────

export function setCachedCalendar(events: CalendarEvent[], overflow: number): void {
  cachedCalendarEvents  = events;
  cachedCalendarOverflow = overflow;
  broadcast({ type: 'calendar', events, overflow });
}

export function getCachedCalendar(): { events: CalendarEvent[]; overflow: number } {
  return { events: cachedCalendarEvents, overflow: cachedCalendarOverflow };
}

// ── Connection lifecycle ──────────────────────────────────────────────────────

function startConnection(): void {
  if (initCalled) return;
  initCalled = true;
  void connect();
}

async function connect(): Promise<void> {
  const haUrl   = overrideUrl   ?? env.HA_URL;
  const haToken = overrideToken ?? env.HA_TOKEN;
  if (!haUrl || !haToken) {
    console.error('[HA] No HA credentials available (env or override) — cannot connect');
    return;
  }

  console.log('[HA] Connecting to', haUrl);
  try {
    const auth = createLongLivedTokenAuth(haUrl, haToken);
    conn = await createConnection({ auth });

    isConnected = true;
    reconnectDelay = 1_000; // reset backoff on successful connect
    console.log('[HA] Connected');
    broadcast({ type: 'status', connected: true });

    // ── Entity subscription ──────────────────────────────────────────────────
    subscribeEntities(conn, (entities) => {
      const prev = currentEntities;
      currentEntities = entities;

      if (Object.keys(prev).length === 0) {
        // First delivery — full snapshot
        broadcast({ type: 'snapshot', entities });
      } else {
        // Incremental — only changed entities
        for (const [id, entity] of Object.entries(entities)) {
          if (prev[id] !== entity) {
            broadcast({ type: 'patch', entityId: id, state: entity });
          }
        }
      }
    });

    // ── Location name (fetched once on first connect) ────────────────────────
    if (!cachedLocationName) {
      void fetchLocationName(conn);
    }

    // ── Disconnect handler ───────────────────────────────────────────────────
    conn.addEventListener('disconnected', () => {
      console.warn('[HA] WebSocket disconnected');
      isConnected = false;
      conn = null;
      broadcast({ type: 'status', connected: false });
      scheduleReconnect();
    });

  } catch (e) {
    console.error('[HA] Connection failed:', e);
    conn = null;
    isConnected = false;
    broadcast({ type: 'status', connected: false });
    scheduleReconnect();
  }
}

async function fetchLocationName(c: Connection): Promise<void> {
  try {
    const config = await c.sendMessagePromise({ type: 'get_config' }) as {
      location_name?: string;
      latitude?: number;
      longitude?: number;
    };
    const name = (config?.location_name ?? '').trim();
    if (name) {
      cachedLocationName = name;
      broadcast({ type: 'config', locationName: name });
      console.log('[HA] Location name:', name);
    }
  } catch (e) {
    console.warn('[HA] Could not fetch location name:', e);
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  console.log(`[HA] Reconnecting in ${reconnectDelay / 1000}s`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT);
}

/**
 * Hot-reload HA credentials WITHOUT restarting the process.
 *
 * Tears down any existing connection, clears cached state, sets the new
 * credentials as overrides, and reconnects immediately. Used by the setup
 * flow so the user never sees a service restart.
 */
export async function reconnectWithCredentials(url: string, token: string): Promise<boolean> {
  console.log('[HA] reconnectWithCredentials — applying new credentials live');

  // Cancel any pending reconnect
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Tear down existing connection
  if (conn) {
    try { (conn as Connection).close(); } catch { /* ignore */ }
    conn = null;
  }
  isConnected = false;

  // Reset state so next subscribeEntities delivers a fresh snapshot
  currentEntities    = {};
  cachedLocationName = '';
  reconnectDelay     = 1_000;

  // Apply overrides and allow a fresh connect
  overrideUrl   = url;
  overrideToken = token;
  initCalled    = false;

  broadcast({ type: 'status', connected: false });

  // Connect now with the new credentials
  await connect();

  return isConnected;
}

// ── Service calls ─────────────────────────────────────────────────────────────

/**
 * Call a HA service. Set returnResponse=true to capture the service response
 * (required for weather.get_forecasts).
 */
export async function callService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown> = {},
  returnResponse = false,
): Promise<unknown> {
  if (!conn) throw new Error('HA not connected');

  const msg: Record<string, unknown> = {
    type: 'call_service',
    domain,
    service,
    service_data: serviceData,
  };
  if (returnResponse) msg['return_response'] = true;

  return conn.sendMessagePromise(msg);
}
