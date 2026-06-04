/**
 * POST /api/zones/assign
 * Body: { deviceId: string, areaId: string | null }
 *
 * Updates the HA device registry to assign (or unassign) a device to an area,
 * then triggers an immediate zones registry refresh so the SSE stream reflects
 * the change without waiting for the 10-minute polling interval.
 *
 * Uses a short-lived WebSocket connection (same pattern as zones.ts) so it
 * doesn't depend on the shared state-streaming connection.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createConnection, createLongLivedTokenAuth } from 'home-assistant-js-websocket';
import { env } from '$env/dynamic/private';
import { refreshZoneRegistry } from '$lib/server/ha/zones.js';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json() as unknown;
  const { deviceId, areaId } = body as { deviceId?: unknown; areaId?: unknown };

  if (!deviceId || typeof deviceId !== 'string') {
    error(400, 'deviceId required');
  }
  if (areaId !== null && areaId !== undefined && typeof areaId !== 'string') {
    error(400, 'areaId must be string or null');
  }

  const haUrl   = env.HA_URL;
  const haToken = env.HA_TOKEN;
  if (!haUrl || !haToken) error(500, 'HA_URL / HA_TOKEN not configured');

  let conn: Awaited<ReturnType<typeof createConnection>> | null = null;
  try {
    const auth = createLongLivedTokenAuth(haUrl, haToken);
    conn = await createConnection({ auth });

    await conn.sendMessagePromise({
      type:      'config/device_registry/update',
      device_id: deviceId,
      area_id:   (areaId as string | null | undefined) ?? null,
    });

    conn.close();
    conn = null;

    // Trigger immediate zones refresh so SSE subscribers get updated data
    await refreshZoneRegistry();

    return json({ ok: true });
  } catch (e) {
    conn?.close();
    const msg = e instanceof Error ? e.message : String(e);
    error(500, `Failed to update device: ${msg}`);
  }
};
