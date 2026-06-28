import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);
const CONFIG_PATH = path.resolve('/home/dash/home-display/data/config.json');

export const POST: RequestHandler = async () => {
  console.log('[Settings] Factory reset requested');
  setTimeout(async () => {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
        console.log('[Settings] config.json deleted');
      }
      await execAsync('sudo systemctl reboot');
    } catch (e) {
      console.error('[Settings] Reset/reboot failed:', e);
    }
  }, 600);
  return json({ ok: true });
};
