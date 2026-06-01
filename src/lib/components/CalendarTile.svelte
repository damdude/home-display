<script lang="ts">
  import { Calendar } from 'lucide-svelte';
  import type { CalendarEvent } from '$lib/data/placeholder.js';

  interface Props {
    events:   CalendarEvent[];
    overflow: number;
  }

  let { events, overflow }: Props = $props();

  // ── Time display ─────────────────────────────────────────────────────────────

  /** Format a timed ISO string as "h:MM AM/PM". */
  function formatTime(iso: string): string {
    const d = new Date(iso);
    let h   = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  /** Display label for the time column. */
  function timeLabel(ev: CalendarEvent): string {
    return ev.allDay ? 'All day' : formatTime(ev.start);
  }

  // ── "Happening now" detection — refreshed every minute ───────────────────────

  let nowMs = $state(Date.now());
  let tickTimer: ReturnType<typeof setInterval>;

  $effect(() => {
    tickTimer = setInterval(() => { nowMs = Date.now(); }, 60_000);
    return () => clearInterval(tickTimer);
  });

  function isHappeningNow(ev: CalendarEvent): boolean {
    if (ev.allDay) return false;
    const start = new Date(ev.start).getTime();
    const end   = new Date(ev.end).getTime();
    return nowMs >= start && nowMs < end;
  }
</script>

<div class="calendar">
  <!-- Section label — matches placeholder design -->
  <div class="section-label">
    <Calendar size={13} strokeWidth={2} />
    <span>Today</span>
  </div>

  <!-- Card -->
  <div class="card">
    {#if events.length === 0}
      <p class="empty">Nothing scheduled today</p>
    {:else}
      <div class="events">
        {#each events as ev (ev.start + ev.summary)}
          <div class="event-row">
            <span
              class="time num"
              class:all-day={ev.allDay}
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
    gap: clamp(14px, 1.6vh, 22px);
  }

  .event-row {
    display: grid;
    grid-template-columns: clamp(110px, 11.11vw, 160px) 1fr;
    align-items: baseline;
    gap: 0.5rem;
  }

  /* Time column */
  .time {
    font-size: clamp(15px, 1.39vw, 20px);
    font-weight: 500;
    color: var(--color-accent-info);
    opacity: 0.8;
    white-space: nowrap;
  }

  .time.all-day {
    font-style: italic;
    color: var(--color-text-tertiary);
    opacity: 0.7;
  }

  /* Title column */
  .title {
    font-size: clamp(17px, 1.81vw, 26px);
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
    font-size: clamp(13px, 1.2vw, 16px);
    color: var(--color-text-tertiary);
    opacity: 0.55;
    margin: 0;
    text-align: right;
    padding-right: 0.2rem;
  }
</style>
