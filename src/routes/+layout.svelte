<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { startHaStream } from '$lib/stores/ha.svelte.js';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    // Open the /api/ha SSE stream once for the lifetime of the app.
    // Returns a cleanup function that closes the EventSource on unmount.
    return startHaStream();
  });
</script>

<div class="layout">
  <main class="content">
    {@render children()}
  </main>
  <BottomNav />
</div>

<style>
  .layout {
    display: grid;
    grid-template-rows: 1fr auto;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background: var(--color-canvas);
  }

  .content {
    overflow: hidden;
    min-height: 0;
  }
</style>
