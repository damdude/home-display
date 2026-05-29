<script lang="ts">
  import { ShieldCheck, ShieldAlert, Shield, ShieldOff } from 'lucide-svelte';
  import type { AlarmState } from '$lib/data/placeholder.js';

  let { alarm }: { alarm: AlarmState } = $props();

  type PillStyle = { label: string; color: string; bg: string };
  const STYLES: Record<AlarmState['state'], PillStyle> = {
    disarmed:   { label: 'Disarmed',   color: 'var(--color-accent-safe)',    bg: 'var(--color-accent-safe)'    },
    armed_home: { label: 'Armed Home', color: 'var(--color-accent-climate)', bg: 'var(--color-accent-climate)' },
    armed_away: { label: 'Armed Away', color: 'var(--color-accent-climate)', bg: 'var(--color-accent-climate)' },
    triggered:  { label: 'TRIGGERED',  color: 'var(--color-accent-alert)',   bg: 'var(--color-accent-alert)'   },
  };

  let s = $derived(STYLES[alarm.state]);
</script>

<div
  class="pill"
  class:pulse={alarm.state === 'triggered'}
  style:--pill-color={s.color}
  style:--pill-bg={s.bg}
>
  <!-- Icon inline per state to avoid <svelte:component> -->
  <span class="pill-icon">
    {#if alarm.state === 'disarmed'}
      <ShieldCheck size={14} strokeWidth={2.2} />
    {:else if alarm.state === 'armed_home'}
      <Shield size={14} strokeWidth={2.2} />
    {:else if alarm.state === 'armed_away'}
      <ShieldAlert size={14} strokeWidth={2.2} />
    {:else}
      <ShieldOff size={14} strokeWidth={2.2} />
    {/if}
  </span>
  <span>{s.label}</span>
</div>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px 5px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pill-bg) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--pill-color) 35%, transparent);
    color: var(--pill-color);
    font-size: var(--type-caption);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .pill-icon {
    display: flex;
    align-items: center;
  }

  .pulse {
    animation: alarm-pulse 1s ease-in-out infinite;
  }

  @keyframes alarm-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
</style>
