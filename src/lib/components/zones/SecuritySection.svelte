<script lang="ts">
  import { goto }   from '$app/navigation';
  import { Shield, ShieldCheck, ShieldAlert } from 'lucide-svelte';
  import { haStore, callHaService } from '$lib/stores/ha.svelte.js';

  const ALARM_ID = 'alarm_control_panel.security_partition_1';

  type AlarmState = 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night'
    | 'triggered' | 'pending' | 'arming' | 'disarming' | 'unknown';

  const STATE_LABELS: Record<string, string> = {
    disarmed:   'Disarmed',
    armed_home: 'Armed Home',
    armed_away: 'Armed Away',
    triggered:  'TRIGGERED',
    pending:    'Pending',
    arming:     'Arming…',
    disarming:  'Disarming…',
  };

  const STATE_COLORS: Record<string, string> = {
    disarmed:   'var(--color-accent-safe)',
    armed_home: 'var(--color-accent-triggered)',
    armed_away: 'var(--color-accent-triggered)',
    triggered:  'var(--color-accent-triggered)',
    pending:    'var(--color-accent-alert)',
    arming:     'var(--color-accent-alert)',
    disarming:  'var(--color-accent-info)',
  };

  let alarmState = $derived((haStore.entities[ALARM_ID]?.state ?? 'unknown') as AlarmState);
  let stateLabel = $derived(STATE_LABELS[alarmState] ?? alarmState);
  let stateColor = $derived(STATE_COLORS[alarmState] ?? 'var(--color-text-tertiary)');

  function callAlarm(service: string) {
    callHaService('alarm_control_panel', service, { entity_id: ALARM_ID });
  }
</script>

<div class="security-section">
  <!-- Alarm state badge -->
  <div class="alarm-badge" style:--sc={stateColor}>
    <span class="badge-icon">
      {#if alarmState === 'disarmed'}
        <ShieldCheck size={16} strokeWidth={2} />
      {:else if alarmState === 'triggered'}
        <ShieldAlert size={16} strokeWidth={2} />
      {:else}
        <Shield size={16} strokeWidth={2} />
      {/if}
    </span>
    <span class="badge-text">{stateLabel}</span>
  </div>

  <!-- Quick actions -->
  <div class="action-row">
    <button
      class="action-btn"
      class:active={alarmState === 'disarmed'}
      onclick={() => callAlarm('alarm_disarm')}
    >Disarm</button>
    <button
      class="action-btn"
      class:active={alarmState === 'armed_home'}
      onclick={() => callAlarm('alarm_arm_home')}
    >Arm Home</button>
    <button
      class="action-btn"
      class:active={alarmState === 'armed_away'}
      onclick={() => callAlarm('alarm_arm_away')}
    >Arm Away</button>
  </div>

  <!-- Full view link -->
  <div class="full-link-row">
    <button class="full-link" onclick={() => goto('/security')}>
      Full Security View →
    </button>
  </div>
</div>

<style>
  .security-section { display: flex; flex-direction: column; gap: 10px; }

  .alarm-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 999px;
    background: color-mix(in srgb, var(--sc) 14%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--sc) 35%, transparent);
    color: var(--sc);
    align-self: flex-start;
  }
  .badge-icon { display: flex; align-items: center; }
  .badge-text { font-size: clamp(12px, 1.11vw, 15px); font-weight: 600; }

  .action-row { display: flex; gap: 6px; flex-wrap: wrap; }

  .action-btn {
    padding: 6px 14px; border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    font-size: clamp(13px, 1.11vw, 16px); font-weight: 500;
    cursor: pointer;
    transition: background 150ms, color 150ms, border-color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .action-btn.active {
    background: color-mix(in srgb, var(--color-accent-safe) 16%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--color-accent-safe) 40%, transparent);
    color: var(--color-accent-safe);
    font-weight: 600;
  }
  .action-btn:not(.active):active { background: var(--color-surface-3); }

  .full-link-row { display: flex; justify-content: flex-end; }
  .full-link {
    background: none; border: none; cursor: pointer;
    color: var(--color-accent-info);
    font-size: clamp(12px, 1.04vw, 15px); font-weight: 500;
    padding: 2px 0;
    -webkit-tap-highlight-color: transparent;
  }
  .full-link:active { opacity: 0.65; }
</style>
