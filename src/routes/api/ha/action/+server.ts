/**
 * POST /api/ha/action
 *
 * Fire-and-forget service call proxy to Home Assistant.
 * The browser posts here — HA_TOKEN never reaches the client.
 *
 * Body: { domain: string, service: string, serviceData?: object }
 * Returns 204 on success, 400 on bad request, 503 if HA not connected.
 *
 * Example: toggle outdoor lights
 *   POST /api/ha/action
 *   { "domain": "switch", "service": "toggle",
 *     "serviceData": { "entity_id": "switch.outdoor_lights_outlet1" } }
 */
import { json, error } from '@sveltejs/kit';
import { callService } from '$lib/server/ha/connection.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    error(400, 'Request body must be valid JSON');
  }

  if (
    typeof body !== 'object' || body === null ||
    typeof (body as Record<string, unknown>).domain !== 'string' ||
    typeof (body as Record<string, unknown>).service !== 'string'
  ) {
    error(400, 'Body must include { domain: string, service: string, serviceData?: object }');
  }

  const {
    domain,
    service,
    serviceData = {},
  } = body as { domain: string; service: string; serviceData?: Record<string, unknown> };

  try {
    await callService(domain, service, serviceData);
    return new Response(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('not connected')) {
      error(503, 'Home Assistant is not connected');
    }
    error(500, `Service call failed: ${msg}`);
  }
};
