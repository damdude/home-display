<script lang="ts">
  /**
   * Reusable modal PIN pad, validated against the shared child-lock PIN.
   * Callers should only open this when a PIN is actually configured — if there
   * is no PIN, skip the prompt and act directly.
   */
  import { Lock, Delete } from 'lucide-svelte';
  import { fade, scale }  from 'svelte/transition';
  import { backOut }      from 'svelte/easing';
  import { configStore }  from '$lib/stores/configStore.svelte.js';

  interface Props {
    open: boolean;
    title?: string;
    subtitle?: string;
    onSuccess: () => void;
    onClose: () => void;
  }
  let { open, title = 'Enter PIN', subtitle = '', onSuccess, onClose }: Props = $props();

  let entered = $state('');
  let error   = $state(false);
  let pin = $derived(configStore.security?.childLockPin ?? '');

  // Reset entry whenever the prompt (re)opens
  $effect(() => { if (open) { entered = ''; error = false; } });

  function press(d: string) {
    error = false;
    if (entered.length >= 6) return;
    entered += d;
    if (entered.length >= pin.length) {
      if (entered === pin) {
        entered = '';
        onSuccess();
      } else {
        error = true;
        setTimeout(() => { entered = ''; error = false; }, 600);
      }
    }
  }
  function backspace() { entered = entered.slice(0, -1); error = false; }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="pp-backdrop" transition:fade={{ duration: 180 }} onclick={onClose}>
    <div class="pp" transition:scale={{ duration: 260, start: 0.9, easing: backOut }} onclick={(e) => e.stopPropagation()}>
      <div class="pp-badge"><Lock size={32} strokeWidth={1.6} /></div>
      <h1>{title}</h1>
      {#if subtitle}<p>{subtitle}</p>{/if}

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
    </div>
  </div>
{/if}

<style>
  .pp-backdrop {
    position: fixed; inset: 0; z-index: 9500;
    background: rgba(0,0,0,0.72);
    display: flex; align-items: center; justify-content: center;
    touch-action: none;
    -webkit-user-select: none; user-select: none;
  }
  .pp {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 32px 40px 40px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 28px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
  }
  .pp-badge {
    width: 72px; height: 72px; border-radius: 50%;
    background: var(--color-surface-2); color: var(--color-text-primary);
    display: flex; align-items: center; justify-content: center;
  }
  h1 { font-size: 28px; font-weight: 700; color: var(--color-text-primary); margin: 6px 0 0; }
  p  { font-size: 16px; color: var(--color-text-tertiary); margin: 0 0 6px; text-align: center; }

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
    transition: transform 90ms ease, background 120ms ease;
  }
  .key:active { background: var(--color-surface-3, rgba(127,127,127,0.15)); transform: scale(0.9); }
  .key-empty { visibility: hidden; }
  .key-del { font-size: 0; }
</style>
