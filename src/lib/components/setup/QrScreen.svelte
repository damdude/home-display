<script lang="ts">
  /**
   * Shown on the kiosk when no HA credentials are configured.
   * Displays a QR code + URL so the user can open /setup on their phone.
   *
   * Polls /api/config every 2 s. `/api/setup/test-ha` (submitted from the phone)
   * HOT-RELOADS the live HA connection and writes the token to config.json —
   * it does NOT restart the service (see CLAUDE.md). So we simply wait for the
   * token to appear and then reload into the wizard. A transient fetch failure
   * here (a dev-server recompile / timeout) is just a blip and must NOT change
   * the UI — the old code treated any blip as "restarting → connected", which
   * flipped the screen to "Connected!" with nobody having set anything up.
   */
  import { onMount } from 'svelte';

  let localIp   = $state('…');
  let setupUrl  = $state('');
  let qrSrc     = $state('');
  let connected = $state(false);   // real token detected → brief confirmation before reload
  let qrFailed  = $state(false);

  onMount(() => {
    // Discover IP
    fetch('/api/setup/ip')
      .then(r => r.json())
      .then(({ ip }) => {
        localIp  = ip;
        setupUrl = `http://${ip}:5173/setup`;
        qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(setupUrl)}&size=320x320&margin=10`;
      })
      .catch(() => {
        localIp  = '(could not detect IP)';
        setupUrl = 'http://<PI_IP>:5173/setup';
      });

    // Poll ONLY for the token appearing. Ignore transient failures entirely.
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(3_000) });
        if (!res.ok) return;
        const cfg = await res.json() as { ha?: { token?: string | null } };
        if (cfg?.ha?.token) {   // truthy (real or sanitised '***') → credentials set
          clearInterval(poll);
          connected = true;
          setTimeout(() => window.location.reload(), 1_200);
        }
      } catch {
        /* transient dev-server blip / timeout — keep showing the QR, do nothing */
      }
    }, 2_000);

    return () => clearInterval(poll);
  });
</script>

<div class="screen">
  {#if connected}

    <div class="status-card">
      <div class="checkmark">✓</div>
      <p class="status-title">Connected!</p>
      <p class="status-sub">Loading the setup wizard…</p>
    </div>

  {:else}

    <div class="content">
      <!-- QR code -->
      <div class="qr-wrap">
        {#if qrSrc && !qrFailed}
          <img
            class="qr"
            src={qrSrc}
            alt="Setup QR code"
            onerror={() => { qrFailed = true; }}
          />
        {:else}
          <div class="qr-placeholder">
            <span>📱</span>
            <small>QR unavailable — type URL below</small>
          </div>
        {/if}
      </div>

      <h1>Set up your dashboard</h1>
      <p class="instruction">Scan the code or visit on your phone:</p>
      <p class="url">{setupUrl}</p>
      <p class="sub">Enter your Home Assistant URL and token there,<br>then complete the setup on this screen.</p>
    </div>

  {/if}
</div>

<style>
  .screen {
    position: fixed; inset: 0;
    background: #0a0a0c;
    display: flex; align-items: center; justify-content: center;
    z-index: 300;
  }

  /* ── Waiting state ── */
  .content {
    display: flex; flex-direction: column; align-items: center;
    gap: clamp(16px, 2.5vh, 28px);
    padding: 0 40px;
    text-align: center;
    max-width: 640px;
  }

  .qr-wrap {
    background: #fff;
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  }

  .qr {
    display: block;
    width: clamp(200px, 35vw, 320px);
    height: clamp(200px, 35vw, 320px);
    border-radius: 8px;
  }

  .qr-placeholder {
    width: clamp(200px, 35vw, 320px);
    height: clamp(200px, 35vw, 320px);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    background: #232328;
    border-radius: 8px;
    color: rgba(255,255,255,0.45);
  }
  .qr-placeholder span { font-size: 48px; }
  .qr-placeholder small { font-size: 14px; text-align: center; padding: 0 16px; }

  h1 {
    font-size: clamp(24px, 3.5vw, 42px);
    font-weight: 600; color: #fff; margin: 0;
  }

  .instruction {
    font-size: clamp(14px, 1.8vw, 20px);
    color: rgba(255,255,255,0.55); margin: 0;
  }

  .url {
    font-size: clamp(14px, 1.6vw, 20px);
    font-family: 'Courier New', monospace;
    color: #9b7bb5; font-weight: 700; margin: 0;
    word-break: break-all;
  }

  .sub {
    font-size: clamp(12px, 1.3vw, 16px);
    color: rgba(255,255,255,0.35); margin: 0;
    line-height: 1.5;
  }

  /* ── Status states ── */
  .status-card {
    display: flex; flex-direction: column; align-items: center;
    gap: 20px; text-align: center;
  }

  .status-title {
    font-size: clamp(22px, 3vw, 36px);
    font-weight: 600; color: #fff; margin: 0;
  }
  .status-sub {
    font-size: clamp(14px, 1.6vw, 20px);
    color: rgba(255,255,255,0.45); margin: 0;
  }

  .checkmark {
    font-size: 72px; color: #6b9b7d; line-height: 1;
  }

  /* Spinner */
  .spinner {
    width: 56px; height: 56px; border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.12);
    border-top-color: #9b7bb5;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
