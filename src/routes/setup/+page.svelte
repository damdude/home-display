<script lang="ts">
  let haUrl   = $state('http://192.168.7.39:8123');
  let haToken = $state('');
  let phase   = $state<'form' | 'testing' | 'success' | 'error'>('form');
  let errMsg  = $state('');

  async function submit() {
    if (!haUrl.trim() || !haToken.trim()) return;
    phase  = 'testing';
    errMsg = '';

    try {
      const res  = await fetch('/api/setup/test-ha', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: haUrl.trim(), token: haToken.trim() }),
      });
      const data = await res.json() as { ok?: boolean; message?: string };

      if (res.ok && data.ok) {
        phase = 'success';
        // page intentionally stays on success — do NOT navigate away
      } else {
        errMsg = data.message ?? `Error ${res.status}`;
        phase  = 'error';
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : 'Network error';
      phase  = 'error';
    }
  }
</script>

<svelte:head><title>Dashboard Setup</title></svelte:head>

<div class="page">
  {#if phase === 'success'}
    <!-- PERSISTENT success screen — stays here until user closes tab -->
    <div class="card success-card">
      <div class="checkmark">✓</div>
      <h1>Connected!</h1>
      <p>The dashboard is restarting. This takes about 10 seconds.</p>
      <p class="muted">Look at the kiosk display — the setup wizard will appear shortly.</p>
      <p class="muted">This page will stay here until you close it.</p>
    </div>
  {:else}
    <div class="card">
      <h1>Connect to Home Assistant</h1>
      <p class="subtitle">Enter your Home Assistant details below.</p>

      <label class="field">
        <span>Home Assistant URL</span>
        <input
          type="url"
          bind:value={haUrl}
          placeholder="http://192.168.1.x:8123"
          disabled={phase === 'testing'}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </label>

      <label class="field">
        <span>Long-lived access token</span>
        <textarea
          bind:value={haToken}
          rows="5"
          placeholder="Paste your token here…"
          disabled={phase === 'testing'}
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        ></textarea>
        <small>
          Get this from <strong>Home Assistant → Profile → Security → Create token</strong>
        </small>
      </label>

      {#if phase === 'error'}
        <div class="error-box">{errMsg}</div>
        <button class="btn btn-secondary" onclick={() => phase = 'form'}>Try Again</button>
      {:else}
        <button
          class="btn btn-primary"
          onclick={submit}
          disabled={phase === 'testing' || !haUrl.trim() || !haToken.trim()}
        >
          {phase === 'testing' ? 'Connecting…' : 'Connect'}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    background: #000;
    font-family: system-ui, sans-serif;
    color: #fff;
  }

  .page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  }

  .card {
    width: 100%;
    max-width: 480px;
    background: #111;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 36px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .success-card { text-align: center; gap: 20px; }

  .checkmark {
    font-size: 72px;
    line-height: 1;
    color: #fff;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  p {
    font-size: 15px;
    color: rgba(255,255,255,0.65);
    margin: 0;
  }

  .muted {
    color: rgba(255,255,255,0.35);
    font-size: 13px;
  }

  .subtitle {
    color: rgba(255,255,255,0.55);
    margin-top: -10px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field span {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255,255,255,0.7);
  }

  .field small {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    line-height: 1.4;
  }

  input, textarea {
    padding: 12px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #fff;
    resize: none;
    outline: none;
    transition: border-color 150ms;
  }

  input:focus, textarea:focus {
    border-color: rgba(255,255,255,0.4);
  }

  input:disabled, textarea:disabled { opacity: 0.5; }

  .error-box {
    background: rgba(255,100,100,0.1);
    border: 1px solid rgba(255,100,100,0.3);
    color: #ffaaaa;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 14px;
    line-height: 1.4;
  }

  .btn {
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 150ms, transform 100ms;
  }

  .btn-primary {
    background: #fff;
    color: #000;
  }

  .btn-primary:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-primary:not(:disabled):active { transform: scale(0.98); }

  .btn-secondary {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
  }

  .btn-secondary:active { background: rgba(255,255,255,0.15); }
</style>
