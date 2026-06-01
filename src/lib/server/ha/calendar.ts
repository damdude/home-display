/**
 * Server-only Google Calendar event cache.
 *
 * HA calendar entities only expose the NEXT single event in state attributes.
 * To get a list of today's events, call calendar.get_events with a time range.
 *
 * This module:
 *   - Calls calendar.get_events on connection ready (5 s delay to settle)
 *   - Refreshes every 5 minutes
 *   - Fetches events from now to 30 days ahead
 *   - Filters out already-ended events, sorts all-day first then by start
 *   - Caps at MAX_DISPLAY events; broadcasts overflow count
 *   - Stores the result via connection.setCachedCalendar() which broadcasts
 *     {type: 'calendar', events: [...], overflow: N} to all SSE clients
 *   - Handles failures gracefully (keeps existing cache, logs error)
 */
import { callService, setCachedCalendar } from './connection.js';
import type { CalendarEvent } from '$lib/data/placeholder.js';

const ENTITY_ID        = 'calendar.devessarhome_gmail_com';
const INITIAL_DELAY_MS = 5_000;            // wait for entity subscription to settle
const REFRESH_INTERVAL = 5 * 60 * 1_000;  // 5 minutes
const MAX_DISPLAY      = 7;
const LOOKAHEAD_DAYS   = 30;

let started = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the end of the lookahead window (now + LOOKAHEAD_DAYS) as an ISO string. */
function endOfWindow(): string {
  const d = new Date();
  d.setDate(d.getDate() + LOOKAHEAD_DAYS);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** True if the date string is an all-day date (YYYY-MM-DD, no time component). */
function isAllDay(dateStr: string): boolean {
  return dateStr.length === 10 && !dateStr.includes('T');
}

/** Parse a start/end string to a Date. All-day dates are treated as local noon. */
function parseDate(dateStr: string): Date {
  if (isAllDay(dateStr)) {
    // Avoid timezone skew by parsing as local noon
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  return new Date(dateStr);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Fetch today's upcoming events from HA and update the shared cache.
 * Safe to call multiple times — failures are logged, cache is preserved.
 */
export async function fetchCalendarEvents(): Promise<void> {
  try {
    const now    = new Date();
    const endISO = endOfWindow();

    const result = await callService(
      'calendar',
      'get_events',
      {
        entity_id:       ENTITY_ID,
        start_date_time: now.toISOString(),
        end_date_time:   endISO,
      },
      true, // return_response
    ) as { response: Record<string, { events: Array<{
      summary?:     string;
      start:        string;
      end:          string;
      description?: string | null;
      location?:    string | null;
    }> }> };

    const raw = result?.response?.[ENTITY_ID]?.events ?? [];

    // ── Diagnostic logging — helps diagnose empty calendar issues ─────────────
    console.log(`[HA Calendar] Request window: ${now.toISOString()} → ${endISO}`);
    console.log(`[HA Calendar] Raw events from HA (${raw.length}):`,
      JSON.stringify(raw.map(e => ({ summary: e.summary, start: e.start, end: e.end }))));

    // Normalise and filter
    const nowMs = now.getTime();
    const events: CalendarEvent[] = raw
      .map(ev => ({
        summary:     (ev.summary ?? 'Untitled event').trim() || 'Untitled event',
        start:       ev.start,
        end:         ev.end,
        allDay:      isAllDay(ev.start),
        description: ev.description ?? null,
        location:    ev.location    ?? null,
      }))
      // Drop events that have already ended (end is in the past)
      .filter(ev => parseDate(ev.end).getTime() > nowMs)
      // Sort: all-day first, then by ascending start time
      .sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return parseDate(a.start).getTime() - parseDate(b.start).getTime();
      });

    console.log(`[HA Calendar] Post-filter events (${events.length}):`,
      JSON.stringify(events.map(e => ({ summary: e.summary, start: e.start, end: e.end, allDay: e.allDay }))));

    const overflow = Math.max(0, events.length - MAX_DISPLAY);
    const display  = events.slice(0, MAX_DISPLAY);

    setCachedCalendar(display, overflow);
    console.log(`[HA Calendar] Broadcast: ${display.length} events, +${overflow} overflow`);

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes('not connected')) {
      console.error('[HA] Calendar fetch failed:', msg);
    }
    // Keep existing cached data on transient errors
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/**
 * Start the 5-minute calendar refresh loop. Idempotent.
 */
export function startCalendarRefresh(): void {
  if (started) return;
  started = true;

  // Initial fetch after short delay (waits for entity subscription)
  setTimeout(() => void fetchCalendarEvents(), INITIAL_DELAY_MS);

  // 5-minute refresh
  setInterval(() => void fetchCalendarEvents(), REFRESH_INTERVAL);

  console.log('[HA] Calendar refresh scheduled (every 5 min)');
}
