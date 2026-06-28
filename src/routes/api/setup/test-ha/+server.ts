/**
 * POST /api/setup/test-ha
 * Validates HA credentials, persists them, and hot-reloads the live HA
 * WebSocket connection — WITHOUT restarting the service.
 */
import { json, error } from '@sveltejs/kit';
import { getConfig, setConfig, writeEnvCredentials } from '$lib/server/config.js';
import { reconnectWithCredentials } from '$lib/server/ha/connection.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  console.log('[Setup:test-ha] Request received');

  let body: { url?: string; token?: string };
  try {
    body = await request.json() as typeof body;
  } catch (e) {
    console.error('[Setup:test-ha] JSON parse failed:', e);
    error(400, 'Body must be valid JSON');
  }

  const url   = (body.url   ?? '').trim().replace(/\/$/, '');
  const token = (body.token ?? '').trim();

  console.log('[Setup:test-ha] URL:', url, '| token length:', token.length);

  if (!url || !token) {
    error(400, 'url and token are required');
  }

  // ── Validate against HA REST API ─────────────────────────────────────────────
  try {
    const res = await fetch(`${url}/api/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(8_000),
    });
    if (res.status === 401) error(401, 'Invalid token — check your long-lived access token');
    if (!res.ok)            error(400, `Home Assistant returned ${res.status} — check the URL`);
    console.log('[Setup:test-ha] ✓ HA REST validation passed');
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    error(400, `Could not reach Home Assistant: ${msg}`);
  }

  // ── Persist credentials (config.json + .env) ──────────────────────────────────
  try {
    const existing = getConfig();
    setConfig({ ha: { ...existing.ha, url, token } });
    writeEnvCredentials(url, token);
    console.log('[Setup:test-ha] ✓ Credentials saved to config + .env');
  } catch (e) {
    console.error('[Setup:test-ha] Save failed:', e);
    error(500, 'Failed to save credentials');
  }

  // ── Hot-reload the live WebSocket (NO service restart) ────────────────────────
  try {
    const connected = await reconnectWithCredentials(url, token);
    console.log('[Setup:test-ha] ✓ WebSocket hot-reload, connected =', connected);
  } catch (e) {
    // Even if the live reconnect hiccups, creds are saved and the singleton's
    // own backoff will retry. Don't fail the request for this.
    console.warn('[Setup:test-ha] Hot-reload reconnect warning:', e);
  }

  return json({ ok: true, message: 'Connected!' });
};
