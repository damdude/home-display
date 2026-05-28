<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // No credentials needed here — the browser connects to /api/ha (same
  // origin, no auth). HA_TOKEN never leaves the server.

  type Status = 'connecting' | 'connected' | 'error';
  let status: Status = 'connecting';
  let entityCount = 0;
  let errorMessage = '';
  let es: EventSource | undefined;

  onMount(() => {
    es = new EventSource('/api/ha');

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        connected: boolean;
        entityCount: number;
        error?: string;
      };
      if (data.connected) {
        status = 'connected';
        entityCount = data.entityCount;
      } else {
        status = 'error';
        errorMessage = data.error ?? 'Lost connection to Home Assistant';
      }
    };

    es.onerror = () => {
      status = 'error';
      errorMessage = 'Could not reach /api/ha proxy';
    };
  });

  onDestroy(() => {
    es?.close();
  });
</script>

<main>
  <div class="status-card">
    {#if status === 'connecting'}
      <p class="dot connecting" aria-label="Connecting"></p>
      <p class="label">Connecting to Home Assistant…</p>
    {:else if status === 'connected'}
      <p class="dot connected" aria-label="Connected"></p>
      <p class="label">Connected — {entityCount} entities found</p>
    {:else}
      <p class="dot error" aria-label="Error"></p>
      <p class="label error-text">{errorMessage}</p>
    {/if}
  </div>
</main>

<style>
  main {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
    background-color: #1c1c1e;
  }

  .status-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .dot {
    width: clamp(0.75rem, 1.5vw, 1rem);
    height: clamp(0.75rem, 1.5vw, 1rem);
    border-radius: 9999px;
    margin: 0;
  }

  .dot.connecting {
    background: rgba(235, 235, 245, 0.3);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .dot.connected {
    background: #30d158;
  }

  .dot.error {
    background: #ff453a;
  }

  .label {
    font-size: clamp(1rem, 2.5vw, 1.5rem);
    font-weight: 300;
    letter-spacing: 0.02em;
    color: rgba(235, 235, 245, 0.6);
    margin: 0;
    text-align: center;
  }

  .error-text {
    color: #ff453a;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }
</style>
