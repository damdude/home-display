<!--
  StatusPillRow — horizontal flex-wrap row of status pills.

  Pill content order (left → right): dot · icon · label · status
  The dot is the primary at-a-glance affordance, so it leads.

  isTriggered=true applies a continuous opacity pulse (not a one-shot
  AttentionPulse — this stays until state changes back).
-->
<script lang="ts">
  import {
    ShieldCheck, ShieldAlert, Shield, ShieldOff,
    DoorOpen, DoorClosed,
    Lightbulb,
  } from 'lucide-svelte';
  import type { PillDescriptor } from '$lib/data/placeholder.js';

  let { pills }: { pills: PillDescriptor[] } = $props();
</script>

<div class="pill-row">
  {#each pills as pill (pill.id)}
    <div
      class="pill"
      class:triggered={pill.isTriggered}
      style:--pill-color={pill.dotColor}
    >
      <!-- 1. Colored dot — leads, primary glance affordance -->
      <span class="pill-dot"></span>

      <!-- 2. Icon -->
      <span class="pill-icon">
        {#if pill.iconId === 'shield-check'}
          <ShieldCheck size={18} strokeWidth={2} />
        {:else if pill.iconId === 'shield-alert'}
          <ShieldAlert size={18} strokeWidth={2} />
        {:else if pill.iconId === 'shield'}
          <Shield size={18} strokeWidth={2} />
        {:else if pill.iconId === 'shield-off'}
          <ShieldOff size={18} strokeWidth={2} />
        {:else if pill.iconId === 'door-open'}
          <DoorOpen size={18} strokeWidth={2} />
        {:else if pill.iconId === 'door-closed'}
          <DoorClosed size={18} strokeWidth={2} />
        {:else}
          <Lightbulb size={18} strokeWidth={2} />
        {/if}
      </span>

      <!-- 3. Label -->
      <span class="pill-label">{pill.label}</span>

      <!-- 4. Status — always uses the pill's own color -->
      <span class="pill-status">
        {pill.status}
      </span>
    </div>
  {/each}
</div>

<style>
  .pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* ── Pill shell ── */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 13px 7px 10px;
    border-radius: 999px;
    background: var(--color-surface-1);
    /* Border always tinted by the pill's own status color */
    border: 1px solid color-mix(in srgb, var(--pill-color) 35%, transparent);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    white-space: nowrap;
  }

  /* Triggered: continuous pulse until state changes */
  .pill.triggered {
    animation: triggeredPulse 1.5s cubic-bezier(0.32, 0.72, 0, 1) infinite;
  }

  @keyframes triggeredPulse {
    0%, 100% {
      opacity: 0.6;
      box-shadow: 0 0 0 0 transparent;
    }
    50% {
      opacity: 1;
      box-shadow: 0 0 8px 1px color-mix(in srgb, var(--color-accent-triggered) 30%, transparent);
    }
  }

  /* ── Dot ── */
  .pill-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--pill-color);
    opacity: 0.9;
  }

  /* ── Icon ── */
  .pill-icon {
    display: flex;
    align-items: center;
    color: var(--color-text-secondary);
    opacity: 0.7;
    flex-shrink: 0;
  }

  /* ── Label ── */
  .pill-label {
    font-size: clamp(15px, 1.25vw, 18px);
    font-weight: 500;
    color: var(--color-text-primary);
    letter-spacing: 0.01em;
  }

  /* ── Status — colored to match dot and border ── */
  .pill-status {
    font-size: clamp(14px, 1.18vw, 17px);
    font-weight: 500;
    color: var(--pill-color);
    letter-spacing: 0.01em;
  }
</style>
