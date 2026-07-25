<script lang="ts">
  /**
   * Touch-friendly virtual keyboard for the kiosk setup wizard.
   * Bind `value` to get the typed string.
   */
  interface Props { value: string; }
  let { value = $bindable('') }: Props = $props();

  let caps = $state(true); // Start capitalised (natural for names)

  const ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['⇧','Z','X','C','V','B','N','M','⌫'],
    ['123','   SPACE   ','.'],
  ] as const;

  const NUM_ROWS = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['-','/','.',',',';',':','!','?','@','#'],
    ['⇧','_','&','%','$','(',')','+','=','⌫'],
    ['ABC','   SPACE   '],
  ] as const;

  let numMode = $state(false);

  function tap(key: string) {
    if (key === '⌫') {
      value = value.slice(0, -1);
    } else if (key === '⇧') {
      caps = !caps;
    } else if (key.includes('SPACE')) {
      value += ' ';
    } else if (key === '123') {
      numMode = true;
    } else if (key === 'ABC') {
      numMode = false;
    } else {
      value += caps && !numMode ? key : key.toLowerCase();
      if (caps && !numMode) caps = false; // auto-lower after first capital
    }
  }

  let rows = $derived(numMode ? NUM_ROWS : ROWS);
</script>

<div class="keyboard">
  {#each rows as row}
    <div class="row">
      {#each row as key}
        <button
          class="key"
          class:wide={key.includes('SPACE')}
          class:medium={key === '⇧' || key === '⌫' || key === '123' || key === 'ABC'}
          class:active-caps={key === '⇧' && caps}
          onclick={() => tap(key)}
          aria-label={key.includes('SPACE') ? 'Space' : key}
        >
          {key.includes('SPACE') ? '' : key}
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .keyboard {
    display: flex; flex-direction: column; gap: 10px;
    padding: 14px;
    background: rgba(255,255,255,0.04);
    border-radius: 18px;
    user-select: none;
  }

  .row {
    display: flex; gap: 8px; justify-content: center;
  }

  .key {
    min-width: 58px;
    height: 64px;
    padding: 0 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #1a1a1a;
    color: #fff;
    border-radius: 12px;
    font-size: 24px;
    font-weight: 500;
    cursor: pointer;
    transition: background 80ms, transform 80ms;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
    display: flex; align-items: center; justify-content: center;
  }

  .key:active   { background: rgba(255,255,255,0.25); transform: scale(0.93); }
  .key.wide     { flex: 1; max-width: 340px; }
  .key.medium   { min-width: 88px; }

  .key.active-caps {
    background: rgba(255,255,255,0.2);
    border-color: rgba(255,255,255,0.4);
    color: #fff;
  }
</style>
