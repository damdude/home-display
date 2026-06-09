/**
 * Client-side dashboard config store.
 *
 * Hydrated from GET /api/config on app mount.
 * Updated via PATCH /api/config after wizard steps.
 * Receives live updates via the SSE stream (type: 'dashboard_config').
 */

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
  tabs:  string[];
  home: {
    widgets:  string[];
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

const _defaults: DashboardConfig = {
  version: 1,
  ha:      { url: null, token: null },
  display: { locationLabel: '', idleTimeoutSec: 60 },
  tabs:    [],
  home: {
    widgets:  [],
    entities: { weather: null, calendar: null, climate: null, tempSensor: null, humSensor: null },
  },
  security: { cameras: [], alarm: null },
  zones:    { hiddenAreaIds: [] },
};

let _data = $state<DashboardConfig>(structuredClone(_defaults));

export const configStore = {
  get data():    DashboardConfig { return _data; },
  get ha():      DashboardConfig['ha']       { return _data.ha; },
  get display(): DashboardConfig['display']  { return _data.display; },
  get tabs():    DashboardConfig['tabs']     { return _data.tabs; },
  get home():    DashboardConfig['home']     { return _data.home; },
  get security():DashboardConfig['security'] { return _data.security; },
  get zones():   DashboardConfig['zones']    { return _data.zones; },

  haTokenSet():  boolean { return !!(_data.ha.url && _data.ha.token); },

  isSetupDone(): boolean {
    return !!(
      _data.ha.url &&
      _data.ha.token &&
      _data.tabs.length > 0 &&
      _data.display.locationLabel
    );
  },

  /** Replace the full config (called after /api/config fetch). */
  set(cfg: DashboardConfig): void {
    _data = cfg;
  },

  /** Merge a partial patch into the store (optimistic update after PATCH). */
  patch(p: Partial<DashboardConfig>): void {
    _data = { ..._data, ...p } as DashboardConfig;
  },

  /** Save a partial patch to the server and update local state. */
  async save(patch: Partial<DashboardConfig>): Promise<void> {
    const res = await fetch('/api/config', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Config save failed: ${res.status}`);
    const updated = await res.json() as DashboardConfig;
    _data = updated;
  },

  /**
   * Finalise the setup wizard — POST all wizard data to /api/setup/complete.
   * This writes the complete config.json for the first time.
   */
  async complete(wizardData: {
    roomName:      string;
    tabs:          string[];
    homeWidgets:   string[];
    homeEntities:  DashboardConfig['home']['entities'];
    cameras:       string[];
    alarm:         string;
    hiddenAreaIds: string[];
  }): Promise<void> {
    const res = await fetch('/api/setup/complete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(wizardData),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `${res.status}`);
      throw new Error(`Setup complete failed: ${msg}`);
    }
    const { config } = await res.json() as { ok: boolean; config: DashboardConfig };
    _data = config;
  },

  /** Reset store to defaults (e.g. if user needs to re-run setup). */
  reset(): void {
    _data = structuredClone(_defaults);
    console.log('[ConfigStore] Reset to defaults');
  },
};
