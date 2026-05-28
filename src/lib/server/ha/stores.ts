/**
 * Server-only HA state stores.
 * Lives under src/lib/server/ so SvelteKit enforces that it can never be
 * imported from client-side code.
 *
 * These stores hold authoritative HA state server-side and are the source
 * that the /api/ha SSE proxy reads from. Future phases (controls, security,
 * music) will extend this rather than each opening their own HA connection.
 */
import { writable, derived } from 'svelte/store';
import {
  subscribeEntities,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket';

export const connection = writable<Connection | null>(null);
export const connected = writable(false);
export const entities = writable<HassEntities>({});

export const entityCount = derived(entities, ($e) => Object.keys($e).length);

export function initConnection(conn: Connection): void {
  connection.set(conn);
  connected.set(true);
  subscribeEntities(conn, (updated) => entities.set(updated)).catch((e) =>
    console.error('[HA] entity subscription failed:', e),
  );
}

export function handleDisconnect(): void {
  connected.set(false);
  entities.set({});
}
