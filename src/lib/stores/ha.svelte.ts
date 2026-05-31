/**
 * Client-side HA state store.
 *
 * Consumes the /api/ha SSE stream and exposes reactive state via a single
 * $state object. HA_TOKEN never appears here — data flows in from the server
 * proxy only.
 *
 * Usage:
 *   import { haStore, startHaStream, callHaService } from '$lib/stores/ha.svelte.js';
 *
 *   // In root layout onMount:
 *   onMount(() => startHaStream());
 *
 *   // In a component:
 *   let temp = $derived(haStore.entities['sensor.living_room_thermostat_current_temperature']?.state);
 */
import { browser } from '$app/environment';
import type { HassEntities } from 'home-assistant-js-websocket';
import type { WeatherForecastDay } from '$lib/data/placeholder.js';

// ── Reactive state ────────────────────────────────────────────────────────────

export const haStore = $state({
  /** True once the first successful HA connection is established. */
  connected: false,
  /** Full entity map. Keyed by entity_id. Empty until first snapshot. */
  entities: {} as HassEntities,
  /** 7-day daily forecast. Empty until first forecast message from server. */
  forecast: [] as WeatherForecastDay[],
});

// ── Service call ──────────────────────────────────────────────────────────────

/**
 * POST a service call to /api/ha/action.
 * Fire-and-forget; HA_TOKEN stays server-side.
 */
export async function callHaService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown> = {},
): Promise<void> {
  try {
    const res = await fetch('/api/ha/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, service, serviceData }),
    });
    if (!res.ok && res.status !== 204) {
      console.error(`[HA] Service call ${domain}.${service} failed: HTTP ${res.status}`);
    }
  } catch (e) {
    console.error(`[HA] Service call ${domain}.${service} error:`, e);
  }
}

// ── EventSource lifecycle ─────────────────────────────────────────────────────

/**
 * Open the /api/ha SSE stream and wire it to haStore.
 * Returns a cleanup function — call it in onDestroy if needed.
 * Guards against server-side execution (SSR).
 */
export function startHaStream(): () => void {
  if (!browser) return () => {};

  const es = new EventSource('/api/ha');

  es.onmessage = (e: MessageEvent<string>) => {
    try {
      const msg = JSON.parse(e.data) as {
        type: 'snapshot' | 'patch' | 'forecast' | 'status';
        entities?: HassEntities;
        entityId?: string;
        state?: HassEntities[string];
        data?: WeatherForecastDay[];
        connected?: boolean;
      };

      switch (msg.type) {
        case 'snapshot':
          if (msg.entities) {
            haStore.entities  = msg.entities;
            haStore.connected = true;
          }
          break;

        case 'patch':
          if (msg.entityId && msg.state) {
            haStore.entities = { ...haStore.entities, [msg.entityId]: msg.state };
          }
          break;

        case 'forecast':
          if (msg.data) haStore.forecast = msg.data;
          break;

        case 'status':
          haStore.connected = msg.connected ?? false;
          break;
      }
    } catch (err) {
      console.error('[HA store] Failed to parse SSE message:', err);
    }
  };

  es.onerror = () => {
    haStore.connected = false;
    // EventSource auto-reconnects after a delay; haStore reflects disconnect state
  };

  return () => es.close();
}
