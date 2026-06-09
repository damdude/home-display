/**
 * Server-only dashboard config.
 *
 * Persists to /home/dash/home-display/data/config.json.
 * Falls back to a default (all-null) config when the file doesn't exist.
 *
 * Usage:
 *   getConfig()          → current config (cached)
 *   setConfig(patch)     → deep-merge patch, write file, notify listeners
 *   onConfigChange(cb)   → subscribe to config changes (returns unsub fn)
 *   isSetupDone()        → true when ha.url/token + tabs + locationLabel all set
 */
import fs   from 'fs';
import path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardConfig {
  version: number;
  ha: {
    url:   string | null;
    token: string | null;
  };
  display: {
    locationLabel:  string;
    idleTimeoutSec: number;
  };
  tabs:  Array<'home' | 'security' | 'music' | 'zones'>;
  home: {
    widgets: string[];           // ordered list: 'weather'|'calendar'|'climate'|'quick_actions'|'now_playing'
    entities: {
      weather:    string | null;
      calendar:   string | null;
      climate:    string | null;
      tempSensor: string | null;
      humSensor:  string | null;
    };
  };
  security: {
    cameras: string[];
    alarm:   string | null;
  };
  zones: {
    hiddenAreaIds: string[];
  };
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const CONFIG_DIR  = '/home/dash/home-display/data';
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// Dev fallback: if the Pi path doesn't exist, keep the file next to the project
const FALLBACK_DIR  = path.resolve(process.cwd(), 'data');
const FALLBACK_PATH = path.join(FALLBACK_DIR, 'config.json');

function resolvedPath(): string {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    return CONFIG_PATH;
  } catch {
    if (!fs.existsSync(FALLBACK_DIR)) fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    return FALLBACK_PATH;
  }
}

// ── Default ───────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DashboardConfig = {
  version: 1,
  ha:      { url: null, token: null },
  display: { locationLabel: '', idleTimeoutSec: 60 },
  tabs:    [],
  home: {
    widgets:  [],
    entities: {
      weather:    null,
      calendar:   null,
      climate:    null,
      tempSensor: null,
      humSensor:  null,
    },
  },
  security: { cameras: [], alarm: null },
  zones:    { hiddenAreaIds: [] },
};

// ── State ─────────────────────────────────────────────────────────────────────

let cachedConfig: DashboardConfig | null = null;
const listeners = new Set<(cfg: DashboardConfig) => void>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      typeof tv === 'object' &&
      tv !== null &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[key] = sv;
    }
  }
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function loadConfig(): DashboardConfig {
  const p = resolvedPath();
  if (fs.existsSync(p)) {
    try {
      cachedConfig = JSON.parse(fs.readFileSync(p, 'utf-8')) as DashboardConfig;
      console.log('[Config] Loaded from', p);
    } catch (e) {
      console.error('[Config] Parse error — using defaults:', e);
      cachedConfig = structuredClone(DEFAULT_CONFIG);
    }
  } else {
    cachedConfig = structuredClone(DEFAULT_CONFIG);
    console.log('[Config] No config file found — using defaults');
  }
  return cachedConfig;
}

export function getConfig(): DashboardConfig {
  if (!cachedConfig) loadConfig();
  return cachedConfig!;
}

export function setConfig(patch: Partial<DashboardConfig>): DashboardConfig {
  const current  = getConfig();
  const merged   = deepMerge(
    current   as unknown as Record<string, unknown>,
    patch     as unknown as Record<string, unknown>,
  ) as unknown as DashboardConfig;
  cachedConfig = merged;

  const p = resolvedPath();
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8');
  console.log('[Config] Saved to', p);

  for (const cb of listeners) {
    try { cb(merged); } catch (e) { console.error('[Config] Listener error:', e); }
  }
  return merged;
}

export function onConfigChange(cb: (cfg: DashboardConfig) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isSetupDone(): boolean {
  const c = getConfig();
  return !!(c.ha.url && c.ha.token && c.tabs.length > 0 && c.display.locationLabel);
}

export function haTokenSet(): boolean {
  const c = getConfig();
  return !!(c.ha.url && c.ha.token);
}

/** Write HA_URL and HA_TOKEN into .env so they survive a process restart. */
export function writeEnvCredentials(url: string, token: string): void {
  const envPath = path.resolve(process.cwd(), '.env');
  let content   = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
    // Strip existing HA_URL / HA_TOKEN lines
    content = content
      .split('\n')
      .filter(l => !l.startsWith('HA_URL=') && !l.startsWith('HA_TOKEN='))
      .join('\n')
      .trimEnd();
    if (content) content += '\n';
  }

  content += `HA_URL=${url}\nHA_TOKEN=${token}\n`;
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('[Config] Wrote HA credentials to .env');
}

// Eagerly load on module initialisation
loadConfig();
