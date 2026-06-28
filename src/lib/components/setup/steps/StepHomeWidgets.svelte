<script lang="ts">
  import { Cloud, CalendarDays, Thermometer, Zap, Music2 } from 'lucide-svelte';

  interface Props {
    value:      string[];
    onBack:     () => void;
    onContinue: () => void;
  }
  let { value = $bindable([]), onBack, onContinue }: Props = $props();

  const WIDGETS = [
    { id: 'weather',       label: 'Weather',       desc: '7-day forecast + current conditions',  Icon: Cloud        },
    { id: 'calendar',      label: 'Calendar',      desc: 'Upcoming events from Google Calendar', Icon: CalendarDays },
    { id: 'climate',       label: 'Climate',       desc: 'Thermostat tile with temperature',      Icon: Thermometer  },
    { id: 'quick_actions', label: 'Quick Actions', desc: 'Lights, fans, and switches',            Icon: Zap          },
    { id: 'now_playing',   label: 'Now Playing',   desc: 'Music Assistant mini player',           Icon: Music2       },
  ] as const;

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
  <div class="step-header">
    <h1>Home tab widgets</h1>
    <p>Choose what to show on the Home tab.</p>
  </div>

  <div class="step-body">
    <div class="content-list">
      {#each WIDGETS as { id, label, desc, Icon }}
        {@const on = value.includes(id)}
        <button class="option-row" class:selected={on} onclick={() => toggle(id)}>
          <span class="row-icon">
            <Icon size={20} strokeWidth={1.6} />
          </span>
          <div class="row-text">
            <span class="row-label">{label}</span>
            <span class="row-desc">{desc}</span>
          </div>
          <!-- iOS-style toggle -->
          <span class="toggle" class:on></span>
        </button>
      {/each}
    </div>
  </div>

  <div class="step-footer">
    <button class="btn btn-back" onclick={onBack}>← Back</button>
    <button class="btn btn-continue" disabled={!value.length} onclick={onContinue}>
      Continue →
    </button>
  </div>
</div>

<style>
  .step {
    height: 100%; display: flex; flex-direction: column;
    background: #000; color: #fff; isolation: isolate;
  }

  .step-header {
    flex-shrink: 0; padding: 44px 36px 20px; text-align: center;
  }
  .step-header h1 { font-size: 46px; font-weight: 700; margin: 0; color: #fff; line-height: 1.15; }
  .step-header p  { font-size: 20px; color: rgba(255,255,255,0.45); margin: 8px 0 0; }

  .step-body {
    flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;
    padding: 16px 32px; overflow-y: auto; -webkit-overflow-scrolling: touch;
    touch-action: pan-y; -webkit-user-select: none; user-select: none;
    scrollbar-width: none;
  }
  .step-body::-webkit-scrollbar { display: none; }

  .content-list {
    display: flex; flex-direction: column; gap: 14px;
    width: 100%; max-width: 760px;
  }

  .option-row {
    display: flex; align-items: center; gap: 16px;
    padding: 28px 32px;
    background: #111;
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    color: rgba(255,255,255,0.45);
    font-size: 28px; font-weight: 500;
    cursor: pointer; text-align: left;
    transition: background 120ms, border-color 120ms, color 120ms;
    -webkit-tap-highlight-color: transparent;
    min-height: 92px; width: 100%;
  }
  .option-row.selected {
    background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.4); color: #fff;
  }
  .option-row:active { transform: scale(0.99); }

  .row-icon {
    width: 56px; height: 56px; border-radius: 14px;
    background: rgba(255,255,255,0.05);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: rgba(255,255,255,0.3);
    transition: background 150ms, color 150ms;
  }
  .option-row.selected .row-icon { background: rgba(255,255,255,0.1); color: #fff; }

  .row-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .row-label { font-size: 28px; font-weight: 600; }
  .row-desc  { font-size: 18px; color: rgba(255,255,255,0.28); }
  .option-row.selected .row-desc { color: rgba(255,255,255,0.48); }

  /* iOS-style toggle */
  .toggle {
    width: 50px; height: 28px; border-radius: 999px;
    background: rgba(255,255,255,0.15); flex-shrink: 0;
    position: relative; transition: background 200ms;
  }
  .toggle::after {
    content: '';
    position: absolute; top: 4px; left: 4px;
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(255,255,255,0.6);
    transition: transform 200ms, background 200ms;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }
  .toggle.on { background: rgba(255,255,255,0.82); }
  .toggle.on::after { transform: translateX(22px); background: #000; }

  .step-footer {
    flex-shrink: 0; display: flex; gap: 16px;
    padding: 24px 32px; background: #000;
    border-top: 1px solid rgba(255,255,255,0.07);
  }

  .btn {
    flex: 1; padding: 28px; border: none; border-radius: 18px;
    font-size: 26px; font-weight: 700; cursor: pointer;
    min-height: 92px; transition: opacity 120ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-back { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.55); }
  .btn-back:active { background: rgba(255,255,255,0.12); }
  .btn-continue { background: #fff; color: #000; }
  .btn-continue:disabled { opacity: 0.25; cursor: not-allowed; }
  .btn-continue:not(:disabled):active { transform: scale(0.98); }
</style>
