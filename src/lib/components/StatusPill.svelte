<script lang="ts">
  import { ShieldCheck, ShieldAlert, Shield, ShieldOff } from 'lucide-svelte';
  import type { AlarmState } from '$lib/data/placeholder.js';

  let { alarm }: { alarm: AlarmState } = $props();

  type PillConfig = {
    label:  string;
    color:  string;
    bg:     string;
    icon:   typeof ShieldCheck;
    pulse?: boolean;
  };

  const config: Record<AlarmState['state'], PillConfig> = {
    disarmed:   { label: 'Disarmed',   color: 'var(--color-accent-green)',  bg: 'var(--color-accent-green)',  icon: ShieldCheck },
    armed_home: { label: 'Armed Home', color: 'var(--color-accent-orange)', bg: 'var(--color-accent-orange)', icon: Shield       },
    armed_away: { label: 'Armed Away', color: 'var(--color-accent-orange)', bg: 'var(--color-accent-orange)', icon: ShieldAlert  },
    triggered:  { label: 'TRIGGERED',  color: 'var(--color-accent-red)',    bg: 'var(--color-accent-red)',    icon: ShieldOff, pulse: true },
  };

  let cfg = $derived(config[alarm.state]);
</script>

<div
  class="pill"
  class:pulse={cfg.pulse}
  style:--pill-color={cfg.color}
  style:--pill-bg={cfg.bg}
>
  <svelte:component this={cfg.icon} size={14} strokeWidth={2.2} />
  <span>{cfg.label}</span>
</div>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px 5px 9px;
    border-radius: var(--pill, 999px);
    background: color-mix(in srgb, var(--pill-bg) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--pill-color) 35%, transparent);
    color: var(--pill-color);
    font-size: var(--type-caption);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .pulse {
    animation: alarm-pulse 1s ease-in-out infinite;
  }

  @keyframes alarm-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
</style>
