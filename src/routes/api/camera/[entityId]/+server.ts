/**
 * GET /api/camera/[entityId]
 *
 * Server-side camera snapshot proxy.
 * Fetches the JPEG snapshot from HA with the server-side token and
 * pipes it back to the browser. HA_TOKEN never reaches client-side code.
 *
 * Usage: <img src="/api/camera/camera.front_door?t={cacheKey}" />
 * The ?t parameter is ignored server-side; it's only used by the browser
 * to break the image cache and force a fresh fetch.
 *
 * Returns:
 *   200  image/jpeg  — snapshot from HA
 *   400  Bad Request — entity_id doesn't start with 'camera.'
 *   503  Service Unavailable — HA not reachable or entity unavailable
 */
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple in-memory rate limiter — max 1 request per 500ms per entity
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 500;

export const GET: RequestHandler = async ({ params }) => {
  const { entityId } = params;

  // Validate: only proxy camera entities
  if (!entityId.startsWith('camera.')) {
    error(400, `Invalid entity ID: must start with 'camera.'`);
  }

  const haUrl   = env.HA_URL;
  const haToken = env.HA_TOKEN;
  if (!haUrl || !haToken) {
    error(500, 'HA_URL and HA_TOKEN must be set in .env');
  }

  // Rate limit: reject if same entity was fetched < 500ms ago
  const lastFetch = rateLimitMap.get(entityId) ?? 0;
  const now = Date.now();
  if (now - lastFetch < RATE_LIMIT_MS) {
    error(429, 'Rate limited — use cached snapshot');
  }
  rateLimitMap.set(entityId, now);

  const snapshotUrl = `${haUrl}/api/camera_proxy/${entityId}`;

  let haRes: Response;
  try {
    haRes = await fetch(snapshotUrl, {
      headers: { Authorization: `Bearer ${haToken}` },
      // Reasonable timeout — Pi camera proxies can be slow
      signal: AbortSignal.timeout(8_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    error(503, `Camera fetch failed: ${msg}`);
  }

  if (!haRes.ok) {
    error(haRes.status === 404 ? 404 : 503,
      `HA returned ${haRes.status} for ${entityId}`);
  }

  const contentType = haRes.headers.get('content-type') ?? 'image/jpeg';

  return new Response(haRes.body, {
    headers: {
      'Content-Type':  contentType,
      'Cache-Control': 'no-store',
    },
  });
};
