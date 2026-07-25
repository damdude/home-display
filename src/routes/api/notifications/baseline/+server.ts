import { json } from '@sveltejs/kit';
import fs   from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

const DATA_DIR = '/home/dash/home-display/data';
const FILE     = path.join(DATA_DIR, 'notif-baseline.json');

export const GET: RequestHandler = async () => {
  try {
    if (fs.existsSync(FILE)) {
      const raw  = fs.readFileSync(FILE, 'utf-8');
      const data = JSON.parse(raw) as { ids?: string[] };
      return json({ ids: data.ids ?? [] });
    }
  } catch (e) { console.error('[Notif] baseline read failed:', e); }
  return json({ ids: [] });
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json() as { ids?: string[] };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ ids: body.ids ?? [] }), 'utf-8');
    return json({ ok: true });
  } catch (e) {
    console.error('[Notif] baseline write failed:', e);
    return json({ ok: false }, { status: 500 });
  }
};
