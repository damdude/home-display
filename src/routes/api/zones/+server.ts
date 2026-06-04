/**
 * GET /api/zones
 *
 * SSE stream for zone/area/floor registry.
 * Sends ZoneRegistry immediately on connect, then again on each 10-min refresh.
 * HA_TOKEN never reaches client-side code.
 *
 * Client receives: data: { type: 'zones', data: ZoneRegistry }\n\n
 */
import { env }   from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { subscribeZones, startZoneRefresh } from '$lib/server/ha/zones.js';
import type { RequestHandler } from './$types';

startZoneRefresh();

export const GET: RequestHandler = () => {
  if (!env.HA_URL || !env.HA_TOKEN) {
    error(500, 'HA_URL and HA_TOKEN must be set in .env');
  }

  let unsub:     (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();

      function send(payload: object): void {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`)); }
        catch (_) { /* client disconnected */ }
      }

      unsub     = subscribeZones(reg => send({ type: 'zones', data: reg }));
      heartbeat = setInterval(() => {
        try { controller.enqueue(enc.encode(':heartbeat\n\n')); } catch (_) {}
      }, 20_000);
    },

    cancel() {
      unsub?.();
      clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
