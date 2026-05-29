<script lang="ts">
  import { CalendarDays, Calendar } from 'lucide-svelte';

  const events = [
    { time: '10:00 AM', title: 'Dentist Appointment',  color: 'var(--color-accent-alert)'   },
    { time: '2:00 PM',  title: 'Team Standup',         color: 'var(--color-accent-info)'    },
    { time: '7:00 PM',  title: 'Dinner with family',   color: 'var(--color-accent-safe)'    },
  ];

  function today(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  }
</script>

<div class="calendar-wrap">
  <div class="section-label">
    <Calendar size={13} strokeWidth={2} />
    <span>Today</span>
  </div>

<div class="card">
  <div class="header">
    <CalendarDays size={16} strokeWidth={1.8} />
    <span class="date">{today()}</span>
  </div>
  <div class="events">
    {#each events as ev}
      <div class="event">
        <div class="dot" style:background={ev.color}></div>
        <span class="time num">{ev.time}</span>
        <span class="title">{ev.title}</span>
      </div>
    {/each}
  </div>
</div>
</div>

<style>
  .calendar-wrap {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

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

  .card {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    border-radius: 28px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: 1rem 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--color-text-tertiary);
    font-size: var(--type-caption);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .events {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    justify-content: center;
  }

  .event {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .time {
    font-size: var(--type-caption);
    color: var(--color-text-tertiary);
    min-width: 5.5rem;
    font-weight: 500;
  }

  .title {
    font-size: var(--type-body);
    color: var(--color-text-primary);
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
