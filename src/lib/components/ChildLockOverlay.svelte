<script lang="ts">
  /**
   * Child-lock gate. When engaged, the live dashboard stays VISIBLE (a lock icon
   * shows in the TopStrip). A transparent full-screen layer swallows all touches
   * so a child can't operate anything — the FIRST touch brings up the PIN pad.
   * Entering the correct PIN disengages the lock.
   *
   * This is a UX gate, NOT hardened security — the PIN is plain text in config.
   */
  import { Lock, Delete } from 'lucide-svelte';
  import { fade, scale }  from 'svelte/transition';
  import { lockState }    from '$lib/stores/lockState.svelte.js';
  import { configStore }  from '$lib/stores/configStore.svelte.js';

  let showPad = $state(false);
  let entered = $state('');
  let error   = $state(false);

  let pin = $derived(configStore.security?.childLockPin ?? '');

  function openPad()  { showPad = true;  entered = ''; error = false; }
  function closePad() { showPad = false; entered = ''; error = false; }

  function press(d: string) {
    error = false;
    if (entered.length >= 6) return;
    entered += d;
    if (entered.length >= pin.length) {
      if (entered === pin) {
        lockState.unlock();
        showPad = false;
        entered = '';
      } else {
        error = true;
        setTimeout(() => { entered = ''; error = false; }, 600);
      }
    }
  }
  function backspace() { entered = entered.slice(0, -1); error = false; }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
</script>

{#if lockState.locked}
  <!-- Transparent capture layer — dashboard shows through; ANY touch opens the
       PIN pad. Above every panel so nothing behind is interactive while locked. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="lock-capture" onpointerdown={openPad}></div>

  {#if showPad}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="pad-backdrop" transition:fade={{ duration: 180 }} onclick={closePad}>
      <div class="pad" transition:scale={{ duration: 220, start: 0.94 }} onclick={(e) => e.stopPropagation()}>
        <div class="lock-badge"><Lock size={34} strokeWidth={1.6} /></div>
        <h1>Child Lock</h1>
        <p>{pin ? 'Enter PIN to unlock' : 'Tap to unlock'}</p>

        {#if pin}
          <div class="dots" class:error>
            {#each Array(Math.max(pin.length, 4)) as _, i}
              <span class="dot" class:filled={i < entered.length}></span>
            {/each}
          </div>

          <div class="keypad">
            {#each keys as k}
              {#if k === ''}
                <span class="key key-empty"></span>
              {:else if k === 'del'}
                <button class="key key-del" onclick={backspace} aria-label="Delete"><Delete size={26} strokeWidth={1.8} /></button>
              {:else}
                <button class="key" onclick={() => press(k)}>{k}</button>
              {/if}
            {/each}
          </div>
        {:else}
          <!-- No PIN configured — a single Unlock action, no code required -->
          <button class="unlock-btn" onclick={() => { lockState.unlock(); showPad = false; }}>Unlock</button>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Capture layer: transparent so the live dashboard is visible; swallows all
     touches so the child can't operate anything. Above every panel. */
  .lock-capture {
    position: fixed; inset: 0; z-index: 9000;
    background: transparent;
    touch-action: none;
    -webkit-user-select: none; user-select: none;
  }

  .pad-backdrop {
    position: fixed; inset: 0; z-index: 9001;
    background: rgba(0,0,0,0.72);
    display: flex; align-items: center; justify-content: center;
    touch-action: none;
    -webkit-user-select: none; user-select: none;
  }

  .pad {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 32px 40px 40px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 28px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
  }

  .lock-badge {
    width: 76px; height: 76px; border-radius: 50%;
    background: var(--color-surface-2); color: var(--color-text-primary);
    display: flex; align-items: center; justify-content: center;
  }
  h1 { font-size: 30px; font-weight: 700; color: var(--color-text-primary); margin: 6px 0 0; }
  p  { font-size: 17px; color: var(--color-text-tertiary); margin: 0 0 6px; }

  .dots { display: flex; gap: 15px; margin-bottom: 14px; }
  .dots.error { animation: shake 0.4s; }
  .dot {
    width: 17px; height: 17px; border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--color-text-primary) 40%, transparent);
  }
  .dot.filled { background: var(--color-text-primary); border-color: var(--color-text-primary); }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    25% { transform: translateX(-10px); } 75% { transform: translateX(10px); }
  }

  .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .key {
    width: 88px; height: 88px; border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-primary); font-size: 34px; font-weight: 400; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .key:active { background: var(--color-surface-3, rgba(127,127,127,0.15)); }
  .key-empty { visibility: hidden; }
  .key-del { font-size: 0; }

  .unlock-btn {
    margin-top: 8px;
    padding: 20px 48px; border-radius: 16px; border: none;
    background: var(--color-text-primary); color: var(--color-canvas);
    font-size: 22px; font-weight: 700; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .unlock-btn:active { opacity: 0.85; }
</style>
