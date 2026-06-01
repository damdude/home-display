<script lang="ts">
  import { Lightbulb, ShieldCheck, ShieldOff, Tv2, Zap } from 'lucide-svelte';
  import QuickShortcut from './QuickShortcut.svelte';
  import { cv } from '$lib/design/tokens.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  const ALARM_ID = 'alarm_control_panel.security_partition_1';

  let {
    outdoorLightsOn = false,
    onToggleOutdoorLights,
  }: {
    outdoorLightsOn?: boolean;
    onToggleOutdoorLights?: () => void;
  } = $props();

  // Outdoor lights button color shifts when on
  let lightsColor = $derived(outdoorLightsOn ? cv.accent.light : cv.accent.neutral);

  function disarmSecurity() {
    callHaService('alarm_control_panel', 'alarm_disarm', { entity_id: ALARM_ID });
  }
</script>

<div class="quick-actions">
  <!-- Section label -->
  <div class="section-label">
    <Zap size={13} strokeWidth={2} />
    <span>Quick Actions</span>
  </div>

  <div class="row">
    <QuickShortcut
      label="Outdoor Lights"
      color={lightsColor}
      onclick={onToggleOutdoorLights}
    >
      <Lightbulb size={44} strokeWidth={1.4} />
    </QuickShortcut>

    <QuickShortcut label="Arm Security" color={cv.accent.climate}>
      <ShieldCheck size={44} strokeWidth={1.4} />
    </QuickShortcut>

    <QuickShortcut label="Disarm" color={cv.accent.safe} onclick={disarmSecurity}>
      <ShieldOff size={44} strokeWidth={1.4} />
    </QuickShortcut>

    <QuickShortcut label="Living Room TV" color={cv.accent.info}>
      <Tv2 size={44} strokeWidth={1.4} />
    </QuickShortcut>
  </div>
</div>

<style>
  .quick-actions {
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

  .row {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-around;
    min-height: 0;
  }
</style>
