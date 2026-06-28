import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const POST: RequestHandler = async () => {
  console.log('[Settings] Reboot requested');
  setTimeout(async () => {
    try {
      await execAsync('sudo systemctl reboot');
    } catch (e) {
      console.error('[Settings] Reboot failed:', e);
    }
  }, 600);
  return json({ ok: true });
};
