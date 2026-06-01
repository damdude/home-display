<script lang="ts">
  import { Calendar } from 'lucide-svelte';
  import type { CalendarEvent } from '$lib/data/placeholder.js';

  interface Props {
    events:   CalendarEvent[];
    overflow: number;
  }

  let { events, overflow }: Props = $props();

  // ── Expand / collapse state ───────────────────────────────────────────────────
  // Keys are event index. Multiple rows can be expanded simultaneously.
  let expanded = $state(new Set<number>());

  function toggle(idx: number) {
    const next = new Set(expanded);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    expanded = next;
  }

  // ── Date / time formatting ────────────────────────────────────────────────────

  /** "Jun 3 · Tue · 10:00 AM" for timed, "Jun 3 · Tue · All day" for all-day. */
  function whenLabel(ev: CalendarEvent): string {
    if (ev.allDay) {
      const [y, m, d] = ev.start.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return formatDateLabel(date) + ' · All day';
    }
    const date = new Date(ev.start);
    return formatDateLabel(date) + ' · ' + formatTime(date);
  }

  function formatDateLabel(d: Date): string {
    const today    = startOfDay(new Date());
    const tomorrow = startOfDay(new Date(today.getTime() + 86_400_000));
    const ds       = startOfDay(d);

    if (ds.getTime() === today.getTime())    return 'Today';
    if (ds.getTime() === tomorrow.getTime()) return 'Tmrw · ' + d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ' · ' + d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function formatTime(d: Date): string {
    let h    = d.getHours();
    const m  = d.getMinutes().toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }

  function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // ── "Happening now" — refreshed every minute ─────────────────────────────────
  let nowMs = $state(Date.now());

  $effect(() => {
    const t = setInterval(() => { nowMs = Date.now(); }, 60_000);
    return () => clearInterval(t);
  });

  function isHappeningNow(ev: CalendarEvent): boolean {
    if (ev.allDay) return false;
    return nowMs >= new Date(ev.start).getTime() && nowMs < new Date(ev.end).getTime();
  }

  // ── Description helpers ───────────────────────────────────────────────────────

  /** Strip HTML tags and normalise whitespace from calendar description. */
  function cleanDescription(raw: string): string {
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g,  '&')
      .replace(/&lt;/g,   '<')
      .replace(/&gt;/g,   '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#?\w+;/g, '')
      .trim();
  }
</script>

<div class="calendar">
  <div class="section-label">
    <Calendar size={13} strokeWidth={2} />
    <span>Upcoming</span>
  </div>

  <div class="card">
    {#if events.length === 0}
      <p class="empty">Nothing scheduled for the next 30 days</p>
    {:else}
      <div class="events">
        {#each events as ev, idx (ev.start + ev.summary)}
          {@const isExpanded = expanded.has(idx)}
          {@const desc       = ev.description ? cleanDescription(ev.description) : null}
          {@const hasDetail  = !!(desc || ev.location)}

          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            class="event-item"
            class:expandable={hasDetail}
            class:expanded={isExpanded}
            onclick={hasDetail ? () => toggle(idx) : undefined}
          >
            <!-- Header: when + title, always visible -->
            <div class="event-header">
              <span class="event-when" class:now={isHappeningNow(ev)}>{whenLabel(ev)}</span>
              <span class="event-title">{ev.summary}</span>
            </div>

            <!-- Body: description + location, height-animated -->
            {#if hasDetail}
              <div class="event-body" style="--body-max: {isExpanded ? '400px' : '5.2em'}">
                {#if desc}
                  <p class="event-desc" class:clamped={!isExpanded}>{desc}</p>
                {/if}
                {#if isExpanded && ev.location}
                  <p class="event-location">📍 {ev.location}</p>
                {/if}
                {#if !isExpanded}
                  <span class="more-hint">More</span>
                {/if}
              </div>
            {/if}
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
    padding: 0.9rem 1.6rem;
    /* Scroll internally when events overflow (expanded rows) */
    overflow-y: auto;
    scrollbar-width: none;
  }
  .card::-webkit-scrollbar { display: none; }

  /* ── Empty state ── */
  .empty {
    font-size: clamp(15px, 1.39vw, 20px);
    color: var(--color-text-tertiary);
    opacity: 0.6;
    font-style: italic;
    margin: 0;
    text-align: center;
    padding: 1.5rem 0;
  }

  /* ── Event list ── */
  .events {
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 1.2vh, 18px);
  }

  /* ── Event item ── */
  .event-item {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    padding-bottom: clamp(8px, 0.9vh, 14px);
    border-bottom: 1px solid var(--color-border);
  }
  .event-item:last-of-type { border-bottom: none; padding-bottom: 0; }

  .event-item.expandable { cursor: pointer; }
  .event-item.expandable:active { opacity: 0.8; }

  /* ── Header row ── */
  .event-header {
    display: grid;
    grid-template-columns: clamp(130px, 13vw, 190px) 1fr;
    align-items: baseline;
    gap: 0.6rem;
  }

  .event-when {
    font-size: clamp(13px, 1.18vw, 17px);
    font-weight: 500;
    color: var(--color-accent-info);
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-feature-settings: 'tnum' 1;
  }
  .event-when.now { opacity: 1; }

  .event-title {
    font-size: clamp(16px, 1.67vw, 24px);
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Body (description + location) ── */
  .event-body {
    /* height animation via max-height */
    max-height: var(--body-max, 5.2em);
    overflow: hidden;
    transition: max-height 250ms cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    padding-left: calc(clamp(130px, 13vw, 190px) + 0.6rem); /* align under title */
  }

  .event-desc {
    font-size: clamp(12px, 1.04vw, 15px);
    color: var(--color-text-secondary);
    opacity: 0.65;
    font-style: italic;
    margin: 0;
    line-height: 1.45;
    white-space: pre-line; /* respect newlines in description */
  }

  .event-desc.clamped {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .event-location {
    font-size: clamp(12px, 1.04vw, 15px);
    color: var(--color-text-secondary);
    opacity: 0.65;
    font-style: italic;
    margin: 0.3em 0 0;
  }

  /* "More" hint — right-aligned, tiny, same opacity as desc */
  .more-hint {
    display: block;
    font-size: clamp(11px, 0.97vw, 13px);
    color: var(--color-accent-info);
    opacity: 0.55;
    text-align: right;
    margin-top: 0.15em;
  }

  /* ── Overflow indicator ── */
  .overflow {
    font-size: clamp(12px, 1.1vw, 15px);
    color: var(--color-text-tertiary);
    opacity: 0.55;
    margin: 0;
    text-align: right;
    padding-right: 0.2rem;
  }
</style>
