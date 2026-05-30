<script lang="ts">
  import { page } from '$app/stores';
  import { Home, Shield, Music, LayoutGrid } from 'lucide-svelte';

  const tabs = [
    { href: '/',         label: 'Home',     id: 'home'     },
    { href: '/security', label: 'Security', id: 'security' },
    { href: '/music',    label: 'Music',    id: 'music'    },
    { href: '/zones',    label: 'Zones',    id: 'zones'    },
  ] as const;
</script>

<nav class="bottom-nav">
  {#each tabs as tab}
    {@const active = $page.url.pathname === tab.href}
    <a href={tab.href} class="tab" class:active>
      <span class="icon">
        {#if tab.id === 'home'}
          <Home     size={36} strokeWidth={active ? 2.0 : 1.5} />
        {:else if tab.id === 'security'}
          <Shield   size={36} strokeWidth={active ? 2.0 : 1.5} />
        {:else if tab.id === 'music'}
          <Music    size={36} strokeWidth={active ? 2.0 : 1.5} />
        {:else}
          <LayoutGrid size={36} strokeWidth={active ? 2.0 : 1.5} />
        {/if}
      </span>
      <span class="label">{tab.label}</span>
    </a>
  {/each}
</nav>

<style>
  .bottom-nav {
    display: flex;
    align-items: stretch;
    background: var(--color-surface-1);
    border-top: 1px solid var(--color-border);
  }

  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0.5rem 0;
    text-decoration: none;
    color: var(--color-text-secondary);
    opacity: 0.6;
    transition: color 300ms cubic-bezier(0.32, 0.72, 0, 1),
                opacity 300ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .tab.active {
    color: var(--color-accent-info);
    opacity: 1;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .label {
    font-size: 16px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }
</style>
