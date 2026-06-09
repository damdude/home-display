<script lang="ts">
  import VirtualKeyboard from '$lib/components/VirtualKeyboard.svelte';

  interface Props {
    value:      string;
    onContinue: () => void;
  }
  let { value = $bindable(''), onContinue }: Props = $props();

  const PRESETS = [
    'Living Room',
    'Master Bedroom',
    'Master Bathroom',
    'Kitchen',
    'Guest Bedroom',
    'Kids Room',
    'Office',
    'Hallway',
  ];

  let showKeyboard = $state(false);
  let draft        = $state('');

  function select(room: string) { value = room; }
  function openCustom() { draft = ''; showKeyboard = true; }
  function confirmCustom() {
    if (draft.trim()) value = draft.trim();
    showKeyboard = false;
  }
</script>

<div class="step">
  <div class="step-header">
    <h1>What room is this display for?</h1>
  </div>

  <div class="step-body">
    <div class="room-list">
      {#each PRESETS as room}
        <button
          class="room-row"
          class:selected={value === room}
          onclick={() => select(room)}
        >
          <span class="room-label">{room}</span>
          {#if value === room}
            <span class="check">✓</span>
          {/if}
        </button>
      {/each}

      <button
        class="room-row custom-row"
        class:selected={value && !PRESETS.includes(value)}
        onclick={openCustom}
      >
        <span class="room-label">
          {value && !PRESETS.includes(value) ? value : '+ Custom Room Name'}
        </span>
        {#if value && !PRESETS.includes(value)}
          <span class="check">✓</span>
        {/if}
      </button>
    </div>
  </div>

  <div class="step-footer">
    <button class="btn btn-back" disabled>Back</button>
    <button class="btn btn-continue" disabled={!value} onclick={onContinue}>
      Continue →
    </button>
  </div>
</div>

{#if showKeyboard}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={() => showKeyboard = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <h2 class="modal-title">Enter Room Name</h2>
      <div class="preview">
        {#if draft}
          <span class="preview-text">{draft}</span>
        {:else}
          <span class="preview-placeholder">Type below…</span>
        {/if}
      </div>
      <VirtualKeyboard bind:value={draft} />
      <div class="modal-footer">
        <button class="btn btn-back" onclick={() => showKeyboard = false}>Cancel</button>
        <button class="btn btn-continue" disabled={!draft.trim()} onclick={confirmCustom}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Layout ── */
  .step {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #000;
    color: #fff;
  }

  .step-header {
    flex-shrink: 0;
    padding: clamp(24px, 3vh, 40px) clamp(24px, 4vw, 48px) clamp(12px, 2vh, 24px);
    text-align: center;
  }

  .step-header h1 {
    font-size: clamp(24px, 3.5vw, 44px);
    font-weight: 600;
    margin: 0;
    color: #fff;
  }

  .step-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(16px, 2vh, 32px) clamp(24px, 4vw, 48px);
    overflow-y: auto;
  }

  /* ── Room list ── */
  .room-list {
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 1.4vh, 16px);
    width: 100%;
    max-width: 520px;
  }

  .room-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: clamp(18px, 2.5vh, 28px) clamp(20px, 2.5vw, 28px);
    background: #111;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    color: rgba(255, 255, 255, 0.45);
    font-size: clamp(16px, 2vw, 24px);
    font-weight: 500;
    cursor: pointer;
    transition: background 120ms, border-color 120ms, color 120ms;
    -webkit-tap-highlight-color: transparent;
    min-height: clamp(64px, 8vh, 80px);
  }

  .room-row:active { transform: scale(0.99); }

  .room-row.selected {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.35);
    color: #ffffff;
  }

  .room-label { flex: 1; text-align: left; }

  .check {
    font-size: clamp(14px, 1.8vw, 20px);
    color: #fff;
    margin-left: 12px;
  }

  .custom-row {
    border-style: dashed;
  }

  /* ── Footer buttons ── */
  .step-footer {
    flex-shrink: 0;
    display: flex;
    gap: clamp(10px, 1.5vw, 16px);
    padding: clamp(16px, 2vh, 24px) clamp(24px, 4vw, 48px);
    background: #000;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }

  .btn {
    flex: 1;
    padding: clamp(18px, 2.5vh, 26px);
    border: none;
    border-radius: 12px;
    font-size: clamp(16px, 1.8vw, 22px);
    font-weight: 600;
    cursor: pointer;
    transition: opacity 120ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
    min-height: clamp(64px, 8vh, 80px);
  }

  .btn-back {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.55);
  }

  .btn-back:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-back:not(:disabled):active { background: rgba(255,255,255,0.12); }

  .btn-continue {
    background: #fff;
    color: #000;
  }

  .btn-continue:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  .btn-continue:not(:disabled):active {
    transform: scale(0.98);
    background: rgba(255,255,255,0.9);
  }

  /* ── Keyboard modal ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: rgba(0, 0, 0, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-card {
    background: #111;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: clamp(20px, 3vh, 36px);
    width: min(92vw, 680px);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal-title {
    font-size: clamp(16px, 2vw, 22px);
    font-weight: 600;
    margin: 0;
    color: #fff;
  }

  .preview {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: clamp(12px, 1.5vh, 18px);
    min-height: 52px;
    display: flex;
    align-items: center;
    font-size: clamp(18px, 2.2vw, 28px);
    font-weight: 500;
  }

  .preview-text { color: #fff; }
  .preview-placeholder { color: rgba(255,255,255,0.25); }

  .modal-footer {
    display: flex;
    gap: 12px;
    margin-top: 4px;
  }
</style>
