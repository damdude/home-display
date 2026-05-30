<script lang="ts">
  import { Calendar } from 'lucide-svelte';

  const events = [
    { time: '10:00 AM', title: 'Dentist Appointment' },
    { time: '2:00 PM',  title: 'Team Standup'        },
    { time: '7:00 PM',  title: 'Dinner with family'  },
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
          <span class="time num">{ev.time}</span>
          <span class="title">{ev.title}</span>
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1.6rem;
  }

  /* ── Events: two-column grid ── */
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

  /* Time — fixed-width left column */
  .time {
    font-size: clamp(15px, 1.39vw, 20px);
    font-weight: 500;
    color: var(--color-accent-info);
    opacity: 0.8;
    white-space: nowrap;
  }

  /* Title — flex right column */
  .title {
    font-size: clamp(17px, 1.81vw, 26px);
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
