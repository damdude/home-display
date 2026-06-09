/**
 * POST /api/setup/complete
 *
 * Called when the user taps "Launch Dashboard" at the end of the setup wizard.
 * Merges wizard data with the HA credentials already in config.json,
 * writes the final complete config, and starts the HA stream.
 */
import { json, error } from '@sveltejs/kit';
import { getConfig, setConfig } from '$lib/server/config.js';
import { clearWizardData }     from '$lib/server/configTempStore.js';
import type { RequestHandler } from './$types';

interface WizardBody {
  roomName?:      string;
  tabs?:          string[];
  homeWidgets?:   string[];
  homeEntities?:  {
    weather?:    string | null;
    calendar?:   string | null;
    climate?:    string | null;
    tempSensor?: string | null;
    humSensor?:  string | null;
  };
  cameras?:       string[];
  alarm?:         string;
  hiddenAreaIds?: string[];
  idleTimeoutSec?: number;
}

export const POST: RequestHandler = async ({ request }) => {
  console.log('[Setup:complete] Finalising setup...');

  let body: WizardBody;
  try {
    body = await request.json() as WizardBody;
  } catch (e) {
    console.error('[Setup:complete] JSON parse failed:', e);
    error(400, 'Body must be valid JSON');
  }

  // Validate required wizard fields
  if (!body.roomName?.trim()) {
    error(400, 'roomName is required');
  }
  if (!body.tabs || body.tabs.length === 0) {
    error(400, 'At least one tab is required');
  }

  // Read existing config — must already have HA creds from test-ha
  const existing = getConfig();
  if (!existing.ha?.url || !existing.ha?.token) {
    console.error('[Setup:complete] HA credentials missing from config');
    error(400, 'HA credentials not found — please re-run the QR setup');
  }

  try {
    const finalConfig = setConfig({
      display: {
        locationLabel:  body.roomName.trim(),
        idleTimeoutSec: body.idleTimeoutSec ?? 60,
      },
      tabs: (body.tabs as Array<'home' | 'security' | 'music' | 'zones'>),
      home: {
        widgets:  body.homeWidgets ?? [],
        entities: {
          weather:    body.homeEntities?.weather    ?? null,
          calendar:   body.homeEntities?.calendar   ?? null,
          climate:    body.homeEntities?.climate    ?? null,
          tempSensor: body.homeEntities?.tempSensor ?? null,
          humSensor:  body.homeEntities?.humSensor  ?? null,
        },
      },
      security: {
        cameras: body.cameras       ?? [],
        alarm:   body.alarm         || null,
      },
      zones: {
        hiddenAreaIds: body.hiddenAreaIds ?? [],
      },
    });

    // Clear any in-memory temp data
    clearWizardData();

    console.log('[Setup:complete] ✓ Config written — setup complete');
    return json({ ok: true, config: { ...finalConfig, ha: { ...finalConfig.ha, token: '***' } } });

  } catch (e) {
    console.error('[Setup:complete] Write failed:', e);
    error(500, `Failed to save config: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
};
