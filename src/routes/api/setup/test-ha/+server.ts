/**
 * POST /api/setup/test-ha
 * Validates HA credentials and triggers systemd restart
 */
import { json, error } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getConfig, setConfig, writeEnvCredentials } from '$lib/server/config.js';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

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

  console.log('[Setup:test-ha] URL:', url);
  console.log('[Setup:test-ha] Token length:', token.length);

  if (!url || !token) {
    console.error('[Setup:test-ha] Missing url or token');
    error(400, 'url and token are required');
  }

  // ── Validate against HA REST API ─────────────────────────────────────────────
  try {
    console.log('[Setup:test-ha] Testing HA connection...');
    const res = await fetch(`${url}/api/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(8_000),
    });

    console.log('[Setup:test-ha] HA response status:', res.status);

    if (res.status === 401) {
      console.error('[Setup:test-ha] Invalid token');
      error(401, 'Invalid token — check your long-lived access token');
    }
    if (!res.ok) {
      console.error('[Setup:test-ha] HA returned error:', res.status);
      error(400, `Home Assistant returned ${res.status} — check the URL`);
    }

    console.log('[Setup:test-ha] ✓ HA connection validated');
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Setup:test-ha] Connection failed:', msg);
    error(400, `Could not reach Home Assistant: ${msg}`);
  }

  // ── Persist credentials ───────────────────────────────────────────────────────
  // Write HA creds to config.json so haTokenSet() returns true after restart,
  // and to .env so the HA WebSocket (connection.ts) can connect after restart.
  console.log('[Setup:test-ha] Saving credentials to config + .env...');
  try {
    const existing = getConfig();
    setConfig({ ha: { ...existing.ha, url, token } });
    writeEnvCredentials(url, token);
    console.log('[Setup:test-ha] ✓ Config and .env saved');
  } catch (e) {
    console.error('[Setup:test-ha] Config save failed:', e);
    error(500, 'Failed to save config');
  }

  console.log('[Setup:test-ha] ✓ Returning success response');

  // ── Trigger systemd restart ───────────────────────────────────────────────────
  // Send response immediately, then restart in background
  setTimeout(async () => {
    try {
      console.log('[Setup:test-ha] ⚡ Triggering systemd restart via sudo systemctl restart...');
      await execAsync('sudo systemctl restart home-display');
      console.log('[Setup:test-ha] ✓ Restart command sent');
    } catch (e) {
      console.error('[Setup:test-ha] Restart failed:', e);
    }
  }, 1000);

  return json({ ok: true, message: 'Connected! Dashboard is restarting…' });
};
