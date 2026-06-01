<script lang="ts">
  import { Calendar } from 'lucide-svelte';
  import type { CalendarEvent } from '$lib/data/placeholder.js';

  interface Props {
    events:   CalendarEvent[];
    overflow: number;
  }

  let { events, overflow }: Props = $props();

  // ── Time / date display ───────────────────────────────────────────────────────

  /** Format a timed ISO string as "h:MM AM/PM". */
  function formatTime(iso: string): string {
    const d = new Date(iso);
    let h    = d.getHours();
    const m  = d.getMinutes().toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }

  /**
   * Return a compact date prefix for non-today events:
   *   Today     → '' (no prefix, just time)
   *   Tomorrow  → 'Tmrw'
   *   This week → 'Mon', 'Tue', …
   *   Further   → 'Jun 18', 'Dec 3', …
   */
  function datePrefix(iso: string, allDay: boolean): string {
    const evDate = allDay
      ? (() => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); })()
      : new Date(iso);

    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

    evDate.setHours(0, 0, 0, 0);

    if (evDate.getTime() === today.getTime())    return '';
    if (evDate.getTime() === tomorrow.getTime()) return 'Tmrw';
    if (evDate < nextWeek) {
      return evDate.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** Full label for the time column. */
  function timeLabel(ev: CalendarEvent): string {
    if (ev.allDay) {
      const prefix = datePrefix(ev.start, true);
      return prefix ? `${prefix} · All day` : 'All day';
    }
    const prefix = datePrefix(ev.start, false);
    const time   = formatTime(ev.start);
    return prefix ? `${prefix} ${time}` : time;
  }

  // ── "Happening now" detection — refreshed every minute ───────────────────────

  let nowMs = $state(Date.now());

  $effect(() => {
    const t = setInterval(() => { nowMs = Date.now(); }, 60_000);
    return () => clearInterval(t);
  });

  function isHappeningNow(ev: CalendarEvent): boolean {
    if (ev.allDay) return false;
    return nowMs >= new Date(ev.start).getTime() && nowMs < new Date(ev.end).getTime();
  }

  /** True if event is not today (needs date prefix in time column) */
  function isFutureDay(ev: CalendarEvent): boolean {
    return datePrefix(ev.start, ev.allDay) !== '';
  }
</script>

<div class="calendar">
  <!-- Section label -->
  <div class="section-label">
    <Calendar size={13} strokeWidth={2} />
    <span>Upcoming</span>
  </div>

  <!-- Card -->
  <div class="card">
    {#if events.length === 0}
      <p class="empty">Nothing scheduled for the next 30 days</p>
    {:else}
      <div class="events">
        {#each events as ev (ev.start + ev.summary)}
          <div class="event-row">
            <span
              class="time num"
              class:all-day={ev.allDay}
              class:future={isFutureDay(ev)}
            >{timeLabel(ev)}</span>
            <span
              class="title"
              class:now={isHappeningNow(ev)}
            >{ev.summary}</span>
          </div>
        {/each}

        {#if overflow > 0}
          <p class="overflow">+{overflow} more</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .calendar {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  /* ── Section label ── */
  .section-label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--color-text-tertiary);
    font-size: var(--type-label);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 0.2rem;
  }

  /* ── Card ── */
  .card {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1.6rem;
  }

  /* ── Empty state ── */
  .empty {
    font-size: clamp(15px, 1.39vw, 20px);
    color: var(--color-text-tertiary);
    opacity: 0.6;
    font-style: italic;
    margin: 0;
    text-align: center;
  }

  /* ── Events ── */
  .events {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 1.2vh, 18px);
  }

  .event-row {
    display: grid;
    grid-template-columns: clamp(120px, 12.5vw, 180px) 1fr;
    align-items: baseline;
    gap: 0.5rem;
  }

  /* Time column — narrower text for date+time combos */
  .time {
    font-size: clamp(13px, 1.25vw, 18px);
    font-weight: 500;
    color: var(--color-accent-info);
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Future-day events: slightly muted time prefix */
  .time.future {
    opacity: 0.65;
  }

  .time.all-day {
    font-style: italic;
    color: var(--color-text-tertiary);
    opacity: 0.7;
  }

  /* Title column */
  .title {
    font-size: clamp(16px, 1.67vw, 24px);
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title.now {
    color: var(--color-accent-info);
  }

  /* Overflow indicator */
  .overflow {
    font-size: clamp(12px, 1.1vw, 15px);
    color: var(--color-text-tertiary);
    opacity: 0.55;
    margin: 0;
    text-align: right;
    padding-right: 0.2rem;
  }
</style>
