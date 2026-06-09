/**
 * Lightweight in-memory ring buffer of recent HA action calls.
 * Persists for the lifetime of the server process (cleared on restart).
 *
 * Accessible via GET /api/ha/debug — curl from Mac:
 *   curl http://192.168.7.21:5173/api/ha/debug | python3 -m json.tool
 */

export interface ActionEntry {
  ts:          string;                             // ISO timestamp
  domain:      string;
  service:     string;
  entityId:    string | null;                      // extracted from serviceData
  serviceData: Record<string, unknown>;
  status:      204 | 400 | 500 | 503 | 'pending'; // HTTP response from /api/ha/action
  haResult:    'ok' | 'ha_error' | 'not_connected' | 'domain_blocked' | 'pending';
  haError:     string | null;                      // full HA error string if haResult === 'ha_error'
  durationMs:  number | null;                      // round-trip time in ms
}

const MAX_ENTRIES = 60;
const log: ActionEntry[] = [];

export function startEntry(
  domain: string,
  service: string,
  serviceData: Record<string, unknown>,
): ActionEntry {
  const entry: ActionEntry = {
    ts:          new Date().toISOString(),
    domain,
    service,
    entityId:    typeof serviceData.entity_id === 'string' ? serviceData.entity_id : null,
    serviceData,
    status:      'pending',
    haResult:    'pending',
    haError:     null,
    durationMs:  null,
  };
  log.unshift(entry);
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;

  // Also print to server stdout so it shows in `journalctl -u home-display -f`
  console.log(`[HA Action] ▶ ${domain}.${service} → ${entry.entityId ?? '(no entity_id)'}`);
  return entry;
}

export function resolveEntry(
  entry: ActionEntry,
  status: 204 | 400 | 500 | 503,
  haResult: ActionEntry['haResult'],
  haError: string | null,
  startMs: number,
): void {
  entry.status     = status;
  entry.haResult   = haResult;
  entry.haError    = haError;
  entry.durationMs = Date.now() - startMs;

  if (haResult === 'ok') {
    console.log(`[HA Action] ✓ ${entry.domain}.${entry.service} → ${entry.entityId} (${entry.durationMs}ms)`);
  } else {
    console.warn(`[HA Action] ✗ ${entry.domain}.${entry.service} → ${entry.entityId} | ${haResult}${haError ? `: ${haError}` : ''} (${entry.durationMs}ms)`);
  }
}

export function getLog(): ActionEntry[] {
  return log;
}
