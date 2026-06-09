/**
 * GET /api/ha/debug
 *
 * Returns the last 60 HA action calls as JSON.
 * Useful for diagnosing play/pause chain failures from a Mac terminal:
 *
 *   curl http://192.168.7.21:5173/api/ha/debug | python3 -m json.tool
 *   curl http://192.168.7.21:5173/api/ha/debug | python3 -m json.tool | grep -A8 media_pause
 *
 * Each entry shows:
 *   ts          — timestamp
 *   domain      — e.g. "media_player"
 *   service     — e.g. "media_pause"
 *   entityId    — the entity_id that was targeted
 *   status      — HTTP response code (204 = HA accepted, 500 = HA rejected, 503 = HA offline)
 *   haResult    — "ok" | "ha_error" | "not_connected"
 *   haError     — full HA error string when haResult === "ha_error"
 *                 e.g. "not_supported: Media player does not support this command"
 *   durationMs  — round-trip time from dashboard → HA WebSocket
 *
 * If status=204 (ok) but music didn't pause: the command reached HA successfully,
 * but the Cast receiver / app ignored the Cast PAUSE protocol message.
 * That means the issue is in the Cast layer, not in HA or this dashboard.
 */
import { json } from '@sveltejs/kit';
import { getLog } from '$lib/server/ha/actionLog.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  return json(getLog(), {
    headers: {
      // Allow easy curl from Mac without CORS preflight issues
      'Access-Control-Allow-Origin': '*',
    },
  });
};
