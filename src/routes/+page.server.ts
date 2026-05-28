/**
 * Server-side only. Validates that credentials are present so the page
 * fails fast with a clear error rather than silently hanging.
 * No credentials are returned to the client — they stay server-side and
 * are used exclusively by the /api/ha SSE proxy.
 */
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  if (!env.HA_URL || !env.HA_TOKEN) {
    error(500, 'HA_URL and HA_TOKEN must be set in .env');
  }
  // Intentionally returns nothing — credentials must not be serialised into
  // the HTML response where the browser could read them.
};
