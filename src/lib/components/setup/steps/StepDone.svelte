<script lang="ts">
  interface Props {
    roomName:  string;
    tabs:      string[];
    onLaunch:  () => void;
    saving:    boolean;
  }
  let { roomName, tabs, onLaunch, saving }: Props = $props();

  const TAB_LABELS: Record<string, string> = {
    home: 'Home', security: 'Security', music: 'Music', zones: 'Zones',
  };
</script>

<div class="step">
  <div class="hero">
    <div class="checkmark">✓</div>
    <h1>You're all set!</h1>
    <p class="sub">
      <strong>{roomName}</strong> dashboard configured with
      {tabs.map(t => TAB_LABELS[t] ?? t).join(', ')} tabs.
    </p>
  </div>

  <div class="launch-area">
    <button class="launch-btn" disabled={saving} onclick={onLaunch}>
      {saving ? 'Saving…' : 'Launch Dashboard →'}
    </button>
    <p class="note">You can change any of these settings later by long-pressing the dashboard header.</p>
  </div>
</div>

<style>
  .step {
    height: 100%; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: clamp(24px, 4vh, 60px) clamp(24px, 5vw, 80px);
    gap: clamp(36px, 5vh, 60px);
    text-align: center;
  }

  .hero { display: flex; flex-direction: column; align-items: center; gap: 20px; }

  .checkmark {
    width: clamp(80px, 10vw, 120px); height: clamp(80px, 10vw, 120px);
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-accent-safe) 20%, transparent);
    border: 3px solid var(--color-accent-safe);
    display: flex; align-items: center; justify-content: center;
    font-size: clamp(36px, 4.5vw, 56px);
    color: var(--color-accent-safe);
  }

  h1 { font-size: clamp(32px, 4.5vw, 60px); font-weight: 700; color: var(--color-text-primary); margin: 0; }

  .sub {
    font-size: clamp(16px, 1.8vw, 24px);
    color: var(--color-text-secondary); margin: 0; max-width: 480px;
  }

  .launch-area { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; max-width: 400px; }

  .launch-btn {
    width: 100%; padding: clamp(16px, 2.2vh, 24px);
    background: var(--color-accent-music); color: #fff;
    border: none; border-radius: 14px;
    font-size: clamp(18px, 2vw, 26px); font-weight: 700;
    cursor: pointer; transition: opacity 150ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .launch-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .launch-btn:not(:disabled):active { transform: scale(0.97); }

  .note { font-size: clamp(12px, 1.1vw, 15px); color: var(--color-text-tertiary); margin: 0; }
</style>
