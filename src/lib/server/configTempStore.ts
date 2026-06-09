/**
 * In-memory store for temporary wizard state.
 * Cleared on process restart — HA credentials should still be
 * written to config.json (via setConfig) so they survive a restart.
 * This store is useful for accumulating wizard step data server-side.
 */

import type { DashboardConfig } from './config.js';

interface WizardData {
  roomName?:       string;
  selectedTabs?:   Array<'home' | 'security' | 'music' | 'zones'>;
  homeWidgets?:    string[];
  homeEntities?:   DashboardConfig['home']['entities'];
  cameras?:        string[];
  alarm?:          string | null;
  hiddenAreaIds?:  string[];
  idleTimeoutSec?: number;
}

let _wizardData: WizardData = {};

export function getWizardData(): WizardData {
  return JSON.parse(JSON.stringify(_wizardData));
}

export function setWizardData(patch: WizardData): void {
  _wizardData = { ..._wizardData, ...patch };
  console.log('[TempConfig] Wizard data updated:', Object.keys(_wizardData));
}

export function clearWizardData(): void {
  _wizardData = {};
  console.log('[TempConfig] Wizard data cleared');
}

/**
 * Build a final DashboardConfig from wizard data + HA credentials.
 * HA creds are read from config.json (already written by test-ha).
 */
export function buildFinalConfig(
  haUrl:    string,
  haToken:  string,
  wizard:   Required<WizardData>,
): DashboardConfig {
  return {
    version: 1,
    ha:      { url: haUrl, token: haToken },
    display: {
      locationLabel:  wizard.roomName,
      idleTimeoutSec: wizard.idleTimeoutSec ?? 60,
    },
    tabs: wizard.selectedTabs,
    home: {
      widgets:  wizard.homeWidgets,
      entities: wizard.homeEntities,
    },
    security: {
      cameras: wizard.cameras,
      alarm:   wizard.alarm,
    },
    zones: { hiddenAreaIds: wizard.hiddenAreaIds },
  };
}
