<script lang="ts">
  import { Home, Shield, Music2, LayoutGrid } from 'lucide-svelte';

  interface Props {
    value:      string[];
    onBack:     () => void;
    onContinue: () => void;
  }
  let { value = $bindable([]), onBack, onContinue }: Props = $props();

  const TABS = [
    { id: 'home',     label: 'Home',     desc: 'Weather, calendar, climate, now playing', Icon: Home      },
    { id: 'security', label: 'Security', desc: 'Cameras and alarm panel',                 Icon: Shield    },
    { id: 'music',    label: 'Music',    desc: 'Full music player with Music Assistant',  Icon: Music2    },
    { id: 'zones',    label: 'Zones',    desc: 'Room-by-room device controls',             Icon: LayoutGrid },
  ] as const;

  function toggle(id: string) {
    if (value.includes(id)) {
      // Require at least one tab
      if (value.length > 1) value = value.filter(t => t !== id);
    } else {
      // Maintain canonical order
      const order = ['home', 'security', 'music', 'zones'];
      value = order.filter(t => value.includes(t) || t === id);
    }
  }
</script>

<div class="step">
  <div class="header">
    <h1>Which tabs do you want?</h1>
    <p>You can change this later from the Settings tab.</p>
  </div>

  <div class="tab-list">
    {#each TABS as { id, label, desc, Icon }}
      {@const on = value.includes(id)}
      <button class="tab-row" class:on onclick={() => toggle(id)}>
        <span class="icon-wrap" class:on>
          <Icon size={22} strokeWidth={1.6} />
        </span>
        <div class="tab-text">
          <span class="tab-name">{label}</span>
          <span class="tab-desc">{desc}</span>
        </div>
        <span class="check" class:on>
          {#if on}✓{/if}
        </span>
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

  .tab-list {
    display: flex; flex-direction: column; gap: 12px;
    flex: 1; justify-content: center; max-width: 640px;
  }

  .tab-row {
    display: flex; align-items: center; gap: 16px;
    padding: clamp(14px, 2vh, 22px) clamp(16px, 2vw, 24px);
    border-radius: 16px;
    border: 2px solid rgba(255,255,255,0.08);
    background: var(--color-surface-1);
    cursor: pointer; text-align: left; width: 100%;
    transition: border-color 150ms, background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .tab-row.on {
    border-color: var(--color-accent-music);
    background: color-mix(in srgb, var(--color-accent-music) 12%, var(--color-surface-1));
  }
  .tab-row:active { transform: scale(0.99); }

  .icon-wrap {
    width: 44px; height: 44px; border-radius: 12px;
    background: rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: var(--color-text-secondary);
    transition: background 150ms, color 150ms;
  }
  .icon-wrap.on {
    background: color-mix(in srgb, var(--color-accent-music) 28%, transparent);
    color: var(--color-accent-music);
  }

  .tab-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .tab-name {
    font-size: clamp(16px, 1.8vw, 22px); font-weight: 600;
    color: var(--color-text-primary);
  }
  .tab-desc {
    font-size: clamp(12px, 1.2vw, 16px);
    color: var(--color-text-tertiary);
  }

  .check {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: transparent;
    flex-shrink: 0; transition: all 150ms;
  }
  .check.on {
    background: var(--color-accent-music);
    border-color: var(--color-accent-music);
    color: #fff;
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
