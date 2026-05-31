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
import type { WeatherForecastDay } from '$lib/data/placeholder.js';

// ── Public event union ────────────────────────────────────────────────────────

export type HaEvent =
  | { type: 'snapshot'; entities: HassEntities }
  | { type: 'patch'; entityId: string; state: HassEntity }
  | { type: 'forecast'; data: WeatherForecastDay[] }
  | { type: 'status'; connected: boolean };

// ── Singleton state ───────────────────────────────────────────────────────────

let conn: Connection | null = null;
let isConnected = false;
let initCalled = false;
let currentEntities: HassEntities = {};
let cachedForecast: WeatherForecastDay[] = [];

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

// ── Connection lifecycle ──────────────────────────────────────────────────────

function startConnection(): void {
  if (initCalled) return;
  initCalled = true;
  void connect();
}

async function connect(): Promise<void> {
  const haUrl   = env.HA_URL;
  const haToken = env.HA_TOKEN;
  if (!haUrl || !haToken) {
    console.error('[HA] HA_URL or HA_TOKEN not set in .env — cannot connect');
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

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  console.log(`[HA] Reconnecting in ${reconnectDelay / 1000}s`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT);
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
