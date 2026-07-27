/**
 * POST /api/update/apply
 *
 * Kicks off the self-update. The actual work (git reset → npm ci → build →
 * restart) runs in a SEPARATE systemd unit (home-display-update.service) so that
 * restarting home-display at the end doesn't kill the updater — it lives outside
 * this service's cgroup. Returns immediately; the dashboard restarts on its own.
 */
import { json, error } from '@sveltejs/kit';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const run = promisify(execFile);

export const POST: RequestHandler = async () => {
  console.log('[Update] Apply requested — starting home-display-update.service');
  try {
    // --no-block: return without waiting for the (minutes-long) oneshot to finish.
    await run('sudo', ['systemctl', 'start', '--no-block', 'home-display-update.service'], {
      timeout: 10_000,
    });
    return json({ ok: true, started: true });
  } catch (e) {
    error(
      500,
      `Could not start the updater: ${e instanceof Error ? e.message : 'unknown error'}. ` +
        'Ensure home-display-update.service is installed (appliance images have it).',
    );
  }
};
