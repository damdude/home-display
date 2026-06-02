/**
 * GET /api/artwork?path=/api/media_player_proxy/...
 *
 * Proxies HA-relative media proxy URLs with the server-side HA_TOKEN.
 * Direct CDN URLs (entity_picture starting with https://) never reach
 * this endpoint — the client uses them directly.
 *
 * This only fires for entity_picture values that HA returns as relative
 * paths (e.g. some local media, TTS, or older integrations).
 */
import { env }   from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const path = url.searchParams.get('path');
  if (!path) error(400, 'path query param required');

  const haUrl   = env.HA_URL;
  const haToken = env.HA_TOKEN;
  if (!haUrl || !haToken) error(500, 'HA_URL / HA_TOKEN not set');

  // Only proxy HA-relative paths — never proxy arbitrary URLs
  if (!path.startsWith('/')) error(400, 'path must be a HA-relative path');

  let res: Response;
  try {
    res = await fetch(`${haUrl}${path}`, {
      headers: { Authorization: `Bearer ${haToken}` },
      signal:  AbortSignal.timeout(8_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    error(503, `Artwork fetch failed: ${msg}`);
  }

  if (!res.ok) error(res.status === 404 ? 404 : 503, `HA returned ${res.status}`);

  const ct = res.headers.get('content-type') ?? 'image/jpeg';
  return new Response(res.body, {
    headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=300' },
  });
};
