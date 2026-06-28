<script lang="ts">
  interface Props {
    roomName: string;
    tabs:     string[];
    onLaunch: () => void;
    saving:   boolean;
  }
  let { roomName, tabs, onLaunch, saving }: Props = $props();

  const TAB_LABELS: Record<string, string> = {
    home: 'Home', security: 'Security', music: 'Music', zones: 'Zones',
  };
</script>

<div class="step">
  <div class="step-header">
    <h1>You're all set!</h1>
    <p>Your dashboard is configured and ready to launch.</p>
  </div>

  <div class="step-body">
    <div class="hero">
      <div class="checkmark">✓</div>
      <p class="summary">
        <strong>{roomName}</strong><br>
        <span class="tabs-line">{tabs.map(t => TAB_LABELS[t] ?? t).join(' · ')}</span>
      </p>
      <p class="note">Settings can be changed any time from the gear icon.</p>
    </div>
  </div>

  <div class="step-footer single">
    <button class="btn btn-launch" disabled={saving} onclick={onLaunch}>
      {saving ? 'Saving…' : 'Launch Dashboard →'}
    </button>
  </div>
</div>

<style>
  .step {
    height: 100%; display: flex; flex-direction: column;
    background: #000; color: #fff; isolation: isolate;
  }

  .step-header {
    flex-shrink: 0;
    padding: 44px 36px 20px;
    text-align: center;
  }
  .step-header h1 { font-size: 46px; font-weight: 700; margin: 0; color: #fff; line-height: 1.15; }
  .step-header p  { font-size: 20px; color: rgba(255,255,255,0.45); margin: 8px 0 0; }

  .step-body {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 16px 32px;
  }

  .hero {
    display: flex; flex-direction: column; align-items: center;
    gap: 32px; text-align: center; max-width: 760px;
  }

  .checkmark {
    width: 128px; height: 128px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    border: 2px solid rgba(255,255,255,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 64px; color: #fff;
  }

  .summary {
    font-size: 28px; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.6;
  }
  .summary strong { color: rgba(255,255,255,0.85); font-weight: 600; }
  .tabs-line { font-size: 20px; color: rgba(255,255,255,0.35); }

  .note { font-size: 18px; color: rgba(255,255,255,0.25); margin: 0; }

  .step-footer {
    flex-shrink: 0; display: flex; gap: 16px;
    padding: 24px 32px; background: #000;
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .step-footer.single { justify-content: center; }

  .btn {
    padding: 28px 60px; border: none; border-radius: 18px;
    font-size: 26px; font-weight: 700; cursor: pointer;
    min-height: 92px; min-width: 380px;
    transition: opacity 120ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-launch { background: #fff; color: #000; }
  .btn-launch:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-launch:not(:disabled):active { transform: scale(0.98); opacity: 0.9; }
</style>
