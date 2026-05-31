<script lang="ts">
  import { Lightbulb, ShieldCheck, Tv2, Fan, Zap } from 'lucide-svelte';
  import QuickShortcut from './QuickShortcut.svelte';
  import { cv } from '$lib/design/tokens.js';

  let {
    outdoorLightsOn = false,
    onToggleOutdoorLights,
  }: {
    outdoorLightsOn?: boolean;
    onToggleOutdoorLights?: () => void;
  } = $props();

  // Outdoor lights button color shifts when on
  let lightsColor = $derived(outdoorLightsOn ? cv.accent.light : cv.accent.neutral);
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

    <QuickShortcut label="Living Room TV" color={cv.accent.info}>
      <Tv2 size={44} strokeWidth={1.4} />
    </QuickShortcut>

    <QuickShortcut label="Fan" color={cv.accent.safe}>
      <Fan size={44} strokeWidth={1.4} />
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
