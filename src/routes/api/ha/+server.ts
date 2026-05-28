/**
 * GET /api/ha
 *
 * Server-Sent Events proxy to Home Assistant.
 * The browser connects here with no credentials — HA_TOKEN never leaves
 * the server. Each SSE connection opens one HA WebSocket and streams
 * entity-count updates until the client disconnects.
 *
 * Event shape: { connected: boolean; entityCount: number; error?: string }
 */
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { subscribeEntities } from 'home-assistant-js-websocket';
import { connectToHA } from '$lib/server/ha/client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  if (!env.HA_URL || !env.HA_TOKEN) {
    error(500, 'HA_URL and HA_TOKEN must be set in .env');
  }

  // Capture here — env is read server-side, never forwarded to client
  const haUrl = env.HA_URL;
  const haToken = env.HA_TOKEN;

  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: object) => {
        const line = `data: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(new TextEncoder().encode(line));
      };

      try {
        const conn = await connectToHA(haUrl, haToken);

        // Immediately signal connection so the UI can react
        send({ connected: true, entityCount: 0 });

        const unsub = await subscribeEntities(conn, (entities) => {
          send({ connected: true, entityCount: Object.keys(entities).length });
        });

        conn.addEventListener('disconnected', () => {
          send({ connected: false, entityCount: 0 });
        });

        conn.addEventListener('ready', () => {
          send({ connected: true, entityCount: 0 });
        });

        cleanup = () => {
          unsub();
          conn.close();
        };
      } catch (e) {
        send({
          connected: false,
          entityCount: 0,
          error: e instanceof Error ? e.message : String(e),
        });
        controller.close();
      }
    },

    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // Prevent any intermediate proxy from buffering the stream
      'X-Accel-Buffering': 'no',
    },
  });
};
