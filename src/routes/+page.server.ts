/**
 * Server-side only. Validates that credentials are present so the page
 * fails fast with a clear error rather than silently hanging.
 * No credentials are returned to the client — they stay server-side and
 * are used exclusively by the /api/ha SSE proxy.
 */
import { error } from '@sveltejs/kit';
import { getActiveCredentials } from '$lib/server/ha/connection.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  const { url, token } = getActiveCredentials();
  if (!url || !token) {
    error(500, 'HA credentials not available');
  }
  // Intentionally returns nothing — credentials must not be serialised into
  // the HTML response where the browser could read them.
};
