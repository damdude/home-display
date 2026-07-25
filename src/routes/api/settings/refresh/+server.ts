import { json } from '@sveltejs/kit';
import { refreshAll } from '$lib/server/ha/connection.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
  try { await refreshAll(); } catch (e) { console.error('[Refresh]', e); }
  return json({ ok: true });
};
