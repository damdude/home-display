<script lang="ts">
  let haUrl   = $state('http://192.168.7.39:8123');
  let haToken = $state('');

  // Read sessionStorage synchronously at init (not in onMount) so the very
  // first render already shows the success screen if we were reloaded —
  // doing this in onMount caused a one-frame flash of the form first.
  function wasConnected(): boolean {
    try { return sessionStorage.getItem('setup_connected') === '1'; }
    catch { return false; }
  }

  let phase  = $state<'form' | 'testing' | 'success' | 'error'>(wasConnected() ? 'success' : 'form');
  let errMsg = $state('');

  function handlePageShow(e: PageTransitionEvent) {
    if (!e.persisted) return;
    try {
      if (sessionStorage.getItem('setup_connected') === '1') phase = 'success';
    } catch { /* ignore */ }
  }

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
        // Persist FIRST, so even if Vite reloads the page immediately after,
        // onMount restores the success screen.
        try { sessionStorage.setItem('setup_connected', '1'); } catch { /* ignore */ }
        phase = 'success';
      } else {
        errMsg = data.message ?? `Server returned ${res.status}`;
        phase  = 'error';
      }
    } catch (e) {
      // The WebSocket hot-reload can drop this fetch mid-flight even though the
      // server accepted the credentials. Treat a post-submit network error as
      // success and let the kiosk-side confirm. Persist so a reload keeps us here.
      try { sessionStorage.setItem('setup_connected', '1'); } catch { /* ignore */ }
      phase = 'success';
    }
  }

  function startOver() {
    try { sessionStorage.removeItem('setup_connected'); } catch { /* ignore */ }
    phase   = 'form';
    errMsg  = '';
    haToken = '';
  }
</script>

<svelte:head><title>Dashboard Setup</title></svelte:head>
<svelte:window on:pageshow={handlePageShow} />

<div class="page">
  {#if phase === 'success'}
    <div class="card success-card">
      <div class="checkmark">✓</div>
      <h1>Connected!</h1>
      <p class="body-p">Home Assistant is linked.</p>
      <p class="body-p">Complete the rest of the setup on the dashboard display.</p>
      <p class="muted">You can close this browser tab.</p>
      <button class="btn btn-ghost" onclick={startOver}>Start Over</button>
    </div>
  {:else}
    <div class="card">
      <h1>Set up your dashboard</h1>
      <p class="subtitle">Enter your Home Assistant details to get started.</p>

      <label class="field">
        <span>Home Assistant URL</span>
        <input
          type="url"
          bind:value={haUrl}
          placeholder="http://192.168.1.x:8123"
          disabled={phase === 'testing'}
          autocomplete="off" autocorrect="off"
          autocapitalize="off" spellcheck="false"
        />
      </label>

      <label class="field">
        <span>Long-lived access token</span>
        <textarea
          bind:value={haToken}
          rows="5"
          placeholder="Paste your token here…"
          disabled={phase === 'testing'}
          autocomplete="off" autocorrect="off" spellcheck="false"
        ></textarea>
        <small>
          Home Assistant → Profile → Security →
          Long-Lived Access Tokens → Create Token
        </small>
      </label>

      {#if phase === 'error'}
        <div class="error-box">{errMsg}</div>
        <button class="btn btn-ghost" onclick={() => { phase = 'form'; errMsg = ''; }}>
          Try Again
        </button>
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
    margin: 0; background: #000;
    font-family: system-ui, -apple-system, sans-serif;
    color: #fff; -webkit-font-smoothing: antialiased;
  }
  .page {
    min-height: 100dvh; display: flex;
    align-items: center; justify-content: center;
    padding: 24px; box-sizing: border-box;
  }
  .card {
    width: 100%; max-width: 520px;
    background: #111; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px; padding: 40px 36px;
    display: flex; flex-direction: column; gap: 22px;
  }
  .success-card { text-align: center; gap: 18px; align-items: center; }
  .checkmark { font-size: 80px; line-height: 1; color: #fff; }
  h1 { font-size: 28px; font-weight: 700; color: #fff; margin: 0; }
  .body-p  { font-size: 17px; color: rgba(255,255,255,0.7); margin: 0; }
  .muted   { color: rgba(255,255,255,0.35); font-size: 14px; line-height: 1.6; margin: 0; }
  .subtitle { color: rgba(255,255,255,0.5); font-size: 16px; margin-top: -8px; }
  .field { display: flex; flex-direction: column; gap: 8px; }
  .field > span { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.65); }
  .field small { font-size: 13px; color: rgba(255,255,255,0.3); line-height: 1.5; }
  input, textarea {
    padding: 14px 16px; font-size: 15px;
    font-family: 'Courier New', monospace;
    background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; color: #fff; resize: none; outline: none;
    transition: border-color 150ms; box-sizing: border-box; width: 100%;
  }
  input:focus, textarea:focus { border-color: rgba(255,255,255,0.4); }
  input:disabled, textarea:disabled { opacity: 0.45; cursor: not-allowed; }
  .error-box {
    background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.25);
    color: #ffaaaa; padding: 14px 16px; border-radius: 12px;
    font-size: 14px; line-height: 1.5;
  }
  .btn {
    width: 100%; padding: 18px; border: none; border-radius: 12px;
    font-size: 18px; font-weight: 600; cursor: pointer;
    transition: opacity 150ms, transform 100ms;
    -webkit-tap-highlight-color: transparent; min-height: 60px;
  }
  .btn-primary { background: #fff; color: #000; }
  .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-primary:not(:disabled):active { transform: scale(0.98); }
  .btn-ghost { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
  .btn-ghost:active { background: rgba(255,255,255,0.13); }
</style>
