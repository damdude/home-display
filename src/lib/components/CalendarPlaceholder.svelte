<script lang="ts">
  import { Calendar } from 'lucide-svelte';

  // Each event: dot color varies for visual variety (not semantic)
  const events = [
    { time: '10:00 AM', title: 'Dentist Appointment', dotColor: 'var(--color-accent-info)'    },
    { time: '2:00 PM',  title: 'Team Standup',        dotColor: 'var(--color-accent-light)'   },
    { time: '7:00 PM',  title: 'Dinner with family',  dotColor: 'var(--color-accent-music)'   },
  ];
</script>

<div class="calendar">
  <!-- Section label -->
  <div class="section-label">
    <Calendar size={13} strokeWidth={2} />
    <span>Today</span>
  </div>

  <!-- Card -->
  <div class="card">
    <div class="events">
      {#each events as ev}
        <div class="event-row">
          <!-- Colored dot -->
          <span class="dot" style:background={ev.dotColor}></span>

          <!-- Event title -->
          <span class="title">{ev.title}</span>

          <!-- Time pill -->
          <span class="time-pill num">{ev.time}</span>
        </div>
      {/each}
    </div>
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
    padding: 0 1.4rem;
    display: flex;
    align-items: center;
  }

  /* ── Events list ── */
  .events {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: clamp(12px, 1.4vh, 20px);
  }

  .event-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  /* Dot */
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    opacity: 0.85;
  }

  /* Title — takes all available middle space */
  .title {
    flex: 1;
    font-size: clamp(16px, 1.67vw, 24px);
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Time pill — right-aligned */
  .time-pill {
    flex-shrink: 0;
    font-size: clamp(13px, 1.25vw, 18px);
    font-weight: 400;
    color: var(--color-text-tertiary);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 3px 10px;
    white-space: nowrap;
  }
</style>
