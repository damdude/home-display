<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';

  let { children }: { children: Snippet } = $props();
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
