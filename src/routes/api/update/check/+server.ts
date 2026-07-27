/**
 * GET /api/update/check
 *
 * Compares the installed version against the latest on the git remote (origin)
 * and returns the release notes (commit subjects) that would be applied.
 *
 * Anonymous fetch over HTTPS works because home-display is a public repo — no
 * token is baked into the image. Degrades gracefully if this isn't a git
 * checkout (e.g. an rsync-based dev install).
 */
import { json, error } from '@sveltejs/kit';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const run = promisify(execFile);
const CWD = process.cwd(); // service WorkingDirectory = the app dir

async function git(args: string[], timeout = 30_000): Promise<string> {
  const { stdout } = await run('git', args, { cwd: CWD, timeout });
  return stdout.trim();
}

export const GET: RequestHandler = async () => {
  // Is this a git checkout at all?
  try {
    await git(['rev-parse', '--is-inside-work-tree']);
  } catch {
    return json({
      supported: false,
      reason: 'This install is not a git checkout, so in-place updates are unavailable. Re-flash the SD image to update.',
    });
  }

  try {
    let branch = 'main';
    try {
      const b = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
      if (b && b !== 'HEAD') branch = b;
    } catch { /* keep main */ }

    // Refresh remote refs (network). Timeout kept short so the UI stays responsive.
    await git(['fetch', '--quiet', 'origin', branch], 25_000);

    const current     = await git(['rev-parse', 'HEAD']);
    const latest      = await git(['rev-parse', `origin/${branch}`]);
    const currentDate = await git(['show', '-s', '--format=%cd', '--date=short', 'HEAD']);

    if (current === latest) {
      return json({
        supported: true,
        upToDate: true,
        current: current.slice(0, 7),
        currentDate,
        branch,
      });
    }

    // Release notes = commit subjects between the installed HEAD and the remote.
    // Date-first format (%cd is a fixed YYYY-MM-DD): first 10 chars = date, rest = subject.
    const logOut = await git([
      'log', '--pretty=format:%cd %s', '--date=short', `HEAD..origin/${branch}`,
    ]);
    const notes = logOut
      ? logOut.split('\n').map((line) => ({
          date: line.slice(0, 10),
          subject: line.slice(11),
        }))
      : [];

    return json({
      supported: true,
      upToDate: false,
      current: current.slice(0, 7),
      latest: latest.slice(0, 7),
      currentDate,
      branch,
      count: notes.length,
      notes,
    });
  } catch (e) {
    error(500, `Update check failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  }
};
