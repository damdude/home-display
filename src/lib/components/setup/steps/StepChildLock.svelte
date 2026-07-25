<script lang="ts">
  interface Props {
    pin: string;
    onBack: () => void;
    onContinue: () => void;
  }
  let { pin = $bindable(''), onBack, onContinue }: Props = $props();

  // Two stages: enter the PIN, then confirm it by re-entering.
  let stage   = $state<'enter' | 'confirm'>('enter');
  let first   = $state('');
  let entered = $state('');
  let error   = $state(false);

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];

  function press(d: string) {
    if (entered.length >= 6) return;
    error = false;
    entered += d;
  }
  function backspace() { entered = entered.slice(0, -1); error = false; }

  function proceed() {
    if (stage === 'enter') {
      if (entered.length < 4) return;
      first   = entered;
      entered = '';
      stage   = 'confirm';
    } else {
      if (entered !== first) {
        // Mismatch — shake, then reset back to the first entry
        error = true;
        setTimeout(() => {
          error   = false;
          entered = '';
          first   = '';
          stage   = 'enter';
        }, 800);
        return;
      }
      pin = first;      // only commit the PIN once both entries match
      onContinue();
    }
  }

  function skip() { pin = ''; onContinue(); }

  function goBack() {
    if (stage === 'confirm') {
      // Step back to editing the first PIN instead of leaving the step
      stage   = 'enter';
      entered = first;
      first   = '';
      error   = false;
    } else {
      onBack();
    }
  }

  let canProceed = $derived(
    stage === 'enter' ? entered.length >= 4 : entered.length >= first.length,
  );
</script>

<div class="step">
  <div class="step-header">
    <h1>{stage === 'enter' ? 'Child Lock (optional)' : 'Confirm your PIN'}</h1>
    <p>
      {#if stage === 'enter'}
        Set a 4–6 digit PIN to lock the screen from children. Skip if you don't want one.
      {:else}
        Enter the same PIN again to confirm.
      {/if}
    </p>
  </div>

  <div class="step-body">
    <div class="dots" class:error>
      {#each Array(6) as _, i}
        <span class="dot" class:filled={i < entered.length}></span>
      {/each}
    </div>

    {#if error}
      <p class="err-msg">PINs didn't match — try again</p>
    {/if}

    <div class="keypad">
      {#each keys as k}
        {#if k === ''}<span class="key key-empty"></span>
        {:else if k === 'del'}<button class="key" onclick={backspace}>⌫</button>
        {:else}<button class="key" onclick={() => press(k)}>{k}</button>{/if}
      {/each}
    </div>
  </div>

  <div class="step-footer">
    <button class="btn btn-back" onclick={goBack}>← Back</button>
    {#if stage === 'enter'}
      <button class="btn btn-skip" onclick={skip}>Skip</button>
    {/if}
    <button class="btn btn-continue" disabled={!canProceed} onclick={proceed}>
      {stage === 'enter' ? 'Next →' : 'Confirm ✓'}
    </button>
  </div>
</div>

<style>
  .step { height: 100%; display: flex; flex-direction: column; background: #000; color: #fff; isolation: isolate; }
  .step-header { flex-shrink: 0; padding: 44px 36px 12px; text-align: center; }
  .step-header h1 { font-size: 42px; font-weight: 700; margin: 0; }
  .step-header p { font-size: 19px; color: rgba(255,255,255,0.45); margin: 10px auto 0; max-width: 620px; }
  .step-body { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 16px; }
  .dots { display: flex; gap: 18px; }
  .dots.error { animation: shake 0.4s; }
  .dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); }
  .dot.filled { background: #fff; border-color: #fff; }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    25% { transform: translateX(-12px); } 75% { transform: translateX(12px); }
  }
  .err-msg { margin: 0; font-size: 18px; color: #ff6b6b; font-weight: 600; }
  .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .key {
    width: 104px; height: 104px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.12); background: #111;
    color: #fff; font-size: 40px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .key:active { background: rgba(255,255,255,0.15); }
  .key-empty { visibility: hidden; }
  .step-footer { flex-shrink: 0; display: flex; gap: 16px; padding: 24px 32px; background: #000; border-top: 1px solid rgba(255,255,255,0.07); }
  .btn { flex: 1; padding: 26px; border: none; border-radius: 18px; font-size: 24px; font-weight: 700; cursor: pointer; min-height: 88px; -webkit-tap-highlight-color: transparent; }
  .btn-back { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.55); }
  .btn-skip { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
  .btn-continue { background: #fff; color: #000; }
  .btn-continue:disabled { opacity: 0.25; }
</style>
