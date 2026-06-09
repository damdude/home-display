/**
 * GET  /api/config  — return full config (token field excluded from response)
 * PATCH /api/config  — deep-merge patch, persist, return updated config
 */
import { json, error } from '@sveltejs/kit';
import { getConfig, setConfig } from '$lib/server/config.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  const cfg = getConfig();
  // Never expose the raw token to the browser
  return json(sanitise(cfg));
};

export const PATCH: RequestHandler = async ({ request }) => {
  let patch: Record<string, unknown>;
  try {
    patch = await request.json() as Record<string, unknown>;
  } catch {
    error(400, 'Body must be valid JSON');
  }

  // Reject attempts to set ha.token via this public endpoint
  if (typeof patch.ha === 'object' && patch.ha !== null && 'token' in (patch.ha as object)) {
    delete (patch.ha as Record<string, unknown>).token;
  }

  const updated = setConfig(patch);
  return json(sanitise(updated));
};

/** Strip the HA token before sending to the browser. */
function sanitise(cfg: ReturnType<typeof getConfig>) {
  return {
    ...cfg,
    ha: { url: cfg.ha.url, token: cfg.ha.token ? '***' : null },
  };
}
