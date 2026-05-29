<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { alarmSecurityPartition1 } from '$lib/data/placeholder.js';

  let { children }: { children: Snippet } = $props();
</script>

<div class="layout">
  <header class="header">
    <StatusPill alarm={alarmSecurityPartition1} />
    <ThemeToggle />
  </header>

  <main class="content">
    {@render children()}
  </main>

  <BottomNav />
</div>

<style>
  .layout {
    display: grid;
    grid-template-rows: 6vh 1fr 10vh;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background: var(--color-canvas);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 5vw;
    flex-shrink: 0;
  }

  .content {
    overflow: hidden;
    min-height: 0;
  }
</style>
