/**
 * GET /api/ha
 *
 * Server-Sent Events proxy to Home Assistant.
 *
 * The browser connects here — HA_TOKEN never leaves the server.
 * All SSE clients share a single HA WebSocket connection (singleton in
 * connection.ts). Each client receives:
 *
 *   {type: 'status',   connected: boolean}         — connection state changes
 *   {type: 'snapshot', entities: HassEntities}     — full entity map on connect
 *   {type: 'patch',    entityId, state: HassEntity} — individual entity changes
 *   {type: 'forecast',  data: WeatherForecastDay[]}           — 7-day forecast (hourly refresh)
 *   {type: 'calendar',  events: CalendarEvent[], overflow: N} — today's events (5-min refresh)
 *
 * A comment heartbeat (":heartbeat") is sent every 15 s to keep the connection
 * alive through proxies and idle-connection timeouts.
 */
import { env } from '$env/dynamic/private';
import { subscribe } from '$lib/server/ha/connection.js';
import { startForecastRefresh }  from '$lib/server/ha/forecast.js';
import { startCalendarRefresh }  from '$lib/server/ha/calendar.js';
import type { RequestHandler } from './$types';

// Start refresh loops once at module load. Idempotent.
startForecastRefresh();
startCalendarRefresh();

export const GET: RequestHandler = () => {
  // During setup mode, HA_URL / HA_TOKEN may not yet be in .env.
  // In that case we still open the SSE stream so the client can connect,
  // but we send a 'setup_required' status instead of entity data.
  const haConfigured = !!(env.HA_URL && env.HA_TOKEN);

  let unsub: (() => void) | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();

      function send(payload: object): void {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (_) {
          // Client disconnected; cancel() will clean up
        }
      }

      function sendHeartbeat(): void {
        try {
          controller.enqueue(enc.encode(':heartbeat\n\n'));
        } catch (_) {}
      }

      if (haConfigured) {
        // Normal: subscribe to singleton HA connection
        unsub = subscribe(send);
      } else {
        // Setup mode: tell the client we're waiting for credentials
        send({ type: 'status', connected: false });
      }

      // Heartbeat every 15 s to keep connection alive through proxies
      heartbeatTimer = setInterval(sendHeartbeat, 15_000);
    },

    cancel() {
      unsub?.();
      clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache',
      'Connection':      'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
