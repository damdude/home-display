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
      class:alert={pill.isAlert}
      class:triggered={pill.isTriggered}
    >
      <!-- 1. Colored dot — leads, primary glance affordance -->
      <span class="pill-dot" style:background={pill.dotColor}></span>

      <!-- 2. Icon -->
      <span class="pill-icon">
        {#if pill.iconId === 'shield-check'}
          <ShieldCheck size={15} strokeWidth={2} />
        {:else if pill.iconId === 'shield-alert'}
          <ShieldAlert size={15} strokeWidth={2} />
        {:else if pill.iconId === 'shield'}
          <Shield size={15} strokeWidth={2} />
        {:else if pill.iconId === 'shield-off'}
          <ShieldOff size={15} strokeWidth={2} />
        {:else if pill.iconId === 'door-open'}
          <DoorOpen size={15} strokeWidth={2} />
        {:else if pill.iconId === 'door-closed'}
          <DoorClosed size={15} strokeWidth={2} />
        {:else}
          <Lightbulb size={15} strokeWidth={2} />
        {/if}
      </span>

      <!-- 3. Label -->
      <span class="pill-label">{pill.label}</span>

      <!-- 4. Status -->
      <span class="pill-status" class:alert-text={pill.isAlert}>
        {pill.status}
      </span>
    </div>
  {/each}
</div>

<style>
  .pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  /* ── Pill shell ── */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px 5px 8px;
    border-radius: 999px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 var(--color-highlight);
    white-space: nowrap;
    transition: border-color 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Alert border tint (armed/open states) */
  .pill.alert {
    border-color: color-mix(in srgb, var(--color-accent-triggered) 30%, transparent);
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
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
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
    font-size: clamp(13px, 1.04vw, 15px);
    font-weight: 500;
    color: var(--color-text-primary);
    letter-spacing: 0.01em;
  }

  /* ── Status ── */
  .pill-status {
    font-size: clamp(12px, 0.97vw, 14px);
    font-weight: 400;
    color: var(--color-text-tertiary);
    letter-spacing: 0.01em;
  }

  .pill-status.alert-text {
    color: var(--color-accent-triggered);
    opacity: 1;
    font-weight: 600;
  }
</style>
