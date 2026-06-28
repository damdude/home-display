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
  .step {
    height: 100%; display: flex; flex-direction: column;
    background: #000; color: #fff; isolation: isolate;
  }

  .step-header {
    flex-shrink: 0; padding: 44px 36px 20px; text-align: center;
  }
  .step-header h1 { font-size: 46px; font-weight: 700; margin: 0; color: #fff; line-height: 1.1; }

  .step-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 32px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    -webkit-user-select: none;
    user-select: none;
    scrollbar-width: none;
  }
  .step-body::-webkit-scrollbar { display: none; }

  .room-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    max-width: 760px;
    margin: auto 0;
    padding: 8px 0;
  }

  .room-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 30px 36px;
    background: #111;
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    color: rgba(255,255,255,0.5);
    font-size: 32px; font-weight: 500;
    cursor: pointer;
    transition: background 120ms, border-color 120ms, color 120ms;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
    -webkit-user-select: none;
    user-select: none;
    min-height: 104px;
    flex-shrink: 0;
  }
  .room-row:active { transform: scale(0.99); }
  .room-row.selected {
    background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.45); color: #fff;
  }

  .room-label { flex: 1; text-align: left; }
  .check { font-size: 26px; color: #fff; margin-left: 14px; }
  .custom-row { border-style: dashed; }

  .step-footer {
    flex-shrink: 0; display: flex; gap: 16px;
    padding: 24px 32px; background: #000;
    border-top: 1px solid rgba(255,255,255,0.07);
  }

  .btn {
    flex: 1; padding: 28px; border: none; border-radius: 18px;
    font-size: 26px; font-weight: 700; cursor: pointer;
    min-height: 92px; transition: opacity 120ms, transform 100ms;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-back { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.55); }
  .btn-back:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-back:not(:disabled):active { background: rgba(255,255,255,0.12); }
  .btn-continue { background: #fff; color: #000; }
  .btn-continue:disabled { opacity: 0.25; cursor: not-allowed; }
  .btn-continue:not(:disabled):active { transform: scale(0.98); }

  .modal-backdrop {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.88);
    display: flex; align-items: center; justify-content: center;
  }

  .modal-card {
    background: #111;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px; padding: 32px;
    width: min(94vw, 760px);
    display: flex; flex-direction: column; gap: 18px;
  }

  .modal-title { font-size: 26px; font-weight: 600; margin: 0; color: #fff; }

  .preview {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px; padding: 20px;
    min-height: 64px; display: flex; align-items: center;
    font-size: 30px; font-weight: 500;
  }
  .preview-text { color: #fff; }
  .preview-placeholder { color: rgba(255,255,255,0.25); }

  .modal-footer { display: flex; gap: 16px; margin-top: 4px; }
</style>
