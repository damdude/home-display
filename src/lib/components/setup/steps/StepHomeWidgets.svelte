<script lang="ts">
  import { Cloud, CalendarDays, Thermometer, Zap, Music2 } from 'lucide-svelte';

  interface Props {
    value:      string[];
    onBack:     () => void;
    onContinue: () => void;
  }
  let { value = $bindable([]), onBack, onContinue }: Props = $props();

  const WIDGETS = [
    { id: 'weather',      label: 'Weather',      desc: '7-day forecast + current conditions', Icon: Cloud        },
    { id: 'calendar',     label: 'Calendar',     desc: 'Upcoming events from Google Calendar', Icon: CalendarDays  },
    { id: 'climate',      label: 'Climate',      desc: 'Thermostat tile with temperature',     Icon: Thermometer  },
    { id: 'quick_actions',label: 'Quick Actions', desc: 'Lights, fans, and switches',          Icon: Zap          },
    { id: 'now_playing',  label: 'Now Playing',   desc: 'Music Assistant mini player',         Icon: Music2       },
  ] as const;

  // Canonical display order — drag-and-drop will reorder later
  const ORDER = ['weather', 'calendar', 'climate', 'quick_actions', 'now_playing'];

  function toggle(id: string) {
    if (value.includes(id)) {
      value = value.filter(w => w !== id);
    } else {
      value = ORDER.filter(w => value.includes(w) || w === id);
    }
  }
</script>

<div class="step">
  <div class="header">
    <h1>Home tab widgets</h1>
    <p>Choose what to show on the Home tab. You can reorder them later.</p>
  </div>

  <div class="widget-list">
    {#each WIDGETS as { id, label, desc, Icon }}
      {@const on = value.includes(id)}
      <button class="widget-row" class:on onclick={() => toggle(id)}>
        <span class="icon-wrap" class:on>
          <Icon size={20} strokeWidth={1.6} />
        </span>
        <div class="widget-text">
          <span class="widget-name">{label}</span>
          <span class="widget-desc">{desc}</span>
        </div>
        <span class="toggle" class:on></span>
      </button>
    {/each}
  </div>

  <div class="footer">
    <button class="btn-ghost" onclick={onBack}>← Back</button>
    <button class="btn-primary" disabled={!value.length} onclick={onContinue}>
      Continue →
    </button>
  </div>
</div>

<style>
  .step {
    height: 100%; display: flex; flex-direction: column;
    padding: clamp(24px, 4vh, 48px) clamp(24px, 5vw, 60px);
    gap: clamp(20px, 3vh, 36px);
  }

  .header h1 {
    font-size: clamp(28px, 3.5vw, 48px); font-weight: 700;
    color: var(--color-text-primary); margin: 0 0 8px;
  }
  .header p {
    font-size: clamp(14px, 1.5vw, 20px);
    color: var(--color-text-secondary); margin: 0;
  }

  .widget-list {
    display: flex; flex-direction: column; gap: 10px;
    flex: 1; justify-content: center; max-width: 640px;
  }

  .widget-row {
    display: flex; align-items: center; gap: 14px;
    padding: clamp(12px, 1.8vh, 20px) clamp(14px, 1.8vw, 22px);
    border-radius: 14px;
    border: 1.5px solid rgba(255,255,255,0.07);
    background: var(--color-surface-1);
    cursor: pointer; text-align: left; width: 100%;
    transition: border-color 150ms, background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .widget-row.on {
    border-color: color-mix(in srgb, var(--color-accent-music) 50%, transparent);
    background: color-mix(in srgb, var(--color-accent-music) 8%, var(--color-surface-1));
  }
  .widget-row:active { transform: scale(0.99); }

  .icon-wrap {
    width: 38px; height: 38px; border-radius: 10px;
    background: rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: var(--color-text-secondary);
    transition: background 150ms, color 150ms;
  }
  .icon-wrap.on {
    background: color-mix(in srgb, var(--color-accent-music) 25%, transparent);
    color: var(--color-accent-music);
  }

  .widget-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }
  .widget-name {
    font-size: clamp(15px, 1.6vw, 20px); font-weight: 600;
    color: var(--color-text-primary);
  }
  .widget-desc {
    font-size: clamp(12px, 1.1vw, 15px);
    color: var(--color-text-tertiary);
  }

  /* iOS-style toggle switch */
  .toggle {
    width: 46px; height: 26px; border-radius: 999px;
    background: rgba(255,255,255,0.15); flex-shrink: 0;
    position: relative; transition: background 200ms;
  }
  .toggle::after {
    content: '';
    position: absolute; top: 3px; left: 3px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #fff;
    transition: transform 200ms, background 200ms;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .toggle.on {
    background: var(--color-accent-music);
  }
  .toggle.on::after {
    transform: translateX(20px);
  }

  .footer { display: flex; gap: 12px; margin-top: auto; }

  .btn-primary {
    flex: 2; padding: clamp(14px, 2vh, 20px);
    background: var(--color-accent-music); color: #fff;
    border: none; border-radius: 12px;
    font-size: clamp(16px, 1.7vw, 22px); font-weight: 600;
    cursor: pointer; transition: opacity 150ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-primary:not(:disabled):active { transform: scale(0.97); }

  .btn-ghost {
    flex: 1; padding: clamp(14px, 2vh, 20px);
    background: rgba(255,255,255,0.07); color: var(--color-text-secondary);
    border: none; border-radius: 12px;
    font-size: clamp(16px, 1.7vw, 22px); font-weight: 500;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background 150ms;
  }
  .btn-ghost:active { background: rgba(255,255,255,0.12); }
</style>
