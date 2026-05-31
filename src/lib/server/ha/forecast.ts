/**
 * Server-only weather forecast cache.
 *
 * HA 2024.4+ removed forecast from weather entity attributes.
 * Forecast is now only accessible via the weather.get_forecasts service call
 * with return_response: true.
 *
 * This module:
 *   - Calls weather.get_forecasts on connection ready (5 s delay to let
 *     entity subscription settle)
 *   - Refreshes every hour
 *   - Stores the result via connection.setCachedForecast() which broadcasts
 *     it to all SSE clients as {type: 'forecast', data: [...]}
 *   - Handles failures gracefully (keeps existing cache, logs error)
 */
import { callService, setCachedForecast, getCachedForecast } from './connection.js';
import type { WeatherForecastDay } from '$lib/data/placeholder.js';

const ENTITY_ID        = 'weather.forecast_home';
const INITIAL_DELAY_MS = 5_000;           // wait for entity subscription to settle
const REFRESH_INTERVAL = 60 * 60 * 1_000; // 1 hour

let started = false;

/**
 * Fetch the 7-day forecast from HA and update the shared cache.
 * Safe to call multiple times — failures are logged, cache is preserved.
 */
export async function fetchForecast(): Promise<void> {
  try {
    const result = await callService(
      'weather',
      'get_forecasts',
      { entity_id: ENTITY_ID, type: 'daily' },
      true, // return_response
    ) as { response: Record<string, { forecast: WeatherForecastDay[] }> };

    const days = result?.response?.[ENTITY_ID]?.forecast ?? [];
    const trimmed = days.slice(0, 7);
    setCachedForecast(trimmed);

    console.log(`[HA] Forecast refreshed: ${trimmed.length} days`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // "HA not connected" is expected at startup — don't spam logs
    if (!msg.includes('not connected')) {
      console.error('[HA] Forecast fetch failed:', msg);
    }
    // Keep existing cached data — don't wipe it on a transient error
  }
}

/**
 * Start the hourly forecast refresh loop. Idempotent — safe to call from
 * the SSE endpoint on every request; only one timer is created.
 */
export function startForecastRefresh(): void {
  if (started) return;
  started = true;

  // Initial fetch after short delay (waits for entity subscription)
  setTimeout(() => void fetchForecast(), INITIAL_DELAY_MS);

  // Hourly refresh
  setInterval(() => void fetchForecast(), REFRESH_INTERVAL);

  console.log('[HA] Forecast refresh scheduled (hourly)');
}
