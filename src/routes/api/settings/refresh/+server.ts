import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
  console.log('[Settings] Refresh requested');
  return json({ ok: true });
};
