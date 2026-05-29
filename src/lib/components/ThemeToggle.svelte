<script lang="ts">
  import { onMount } from 'svelte';
  import { Sun, Moon } from 'lucide-svelte';

  let theme = $state<'dark' | 'light'>('dark');

  onMount(() => {
    // Sync with the value the app.html inline script already applied
    const current = document.documentElement.dataset.theme;
    if (current === 'light') theme = 'light';
  });

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('dashboard.theme', theme); } catch (_) {}
  }
</script>

<button class="toggle" onclick={toggle} aria-label="Toggle theme" title="Toggle theme">
  {#if theme === 'dark'}
    <Moon size={20} strokeWidth={1.6} />
  {:else}
    <Sun size={20} strokeWidth={1.6} />
  {/if}
</button>

<style>
  .toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 300ms cubic-bezier(0.32, 0.72, 0, 1),
                color     300ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .toggle:active {
    background: var(--color-border);
    transform: scale(0.94);
  }
</style>
