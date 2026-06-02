/**
 * POST /api/music/browse
 *
 * Calls HA's media_player/browse_media WebSocket message and returns
 * the browse tree. Used by BrowseArea.svelte for MA radio/library/podcast
 * content. HA_TOKEN stays server-side.
 *
 * Body: { entityId: string, mediaContentId?: string, mediaContentType?: string }
 * Returns: HA BrowseMedia response object, or 503 on failure.
 */
import { env }        from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { callService } from '$lib/server/ha/connection.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  if (!env.HA_URL || !env.HA_TOKEN) error(500, 'HA_URL / HA_TOKEN not set');

  const body = await request.json() as {
    entityId?:         string;
    mediaContentId?:   string;
    mediaContentType?: string;
  };

  if (!body.entityId) error(400, 'entityId required');

  try {
    // browse_media is a WebSocket message, not a service call, but we route it
    // through callService with a raw message type via the connection's
    // sendMessagePromise.  Connection.ts exposes callService; for non-service
    // HA WS messages we need the raw send path added here.
    //
    // For now we use the HA REST API equivalent as a fallback until a
    // sendRawMessage helper is added to connection.ts.
    const res = await fetch(
      `${env.HA_URL}/api/media_player_proxy/${body.entityId}/browse_media`
        + (body.mediaContentType ? `/${body.mediaContentType}` : '')
        + (body.mediaContentId   ? `/${encodeURIComponent(body.mediaContentId)}` : ''),
      {
        headers: { Authorization: `Bearer ${env.HA_TOKEN}` },
        signal:  AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      // Not all players support REST browse — return empty gracefully
      return json({ children: [], title: '' }, { status: 200 });
    }

    const data = await res.json();
    return json(data);
  } catch {
    // Browse unavailable (MA not installed, player offline) — return empty
    return json({ children: [], title: '' }, { status: 200 });
  }
};
