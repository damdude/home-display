<script lang="ts">
  import { page } from '$app/stores';
  import { Home, Shield, Music, SlidersHorizontal } from 'lucide-svelte';

  // Inline each icon per tab to avoid <svelte:component> dynamic dispatch
  const tabs = [
    { href: '/',         label: 'Home',     id: 'home'     },
    { href: '/security', label: 'Security', id: 'security' },
    { href: '/music',    label: 'Music',    id: 'music'    },
    { href: '/controls', label: 'Controls', id: 'controls' },
  ] as const;
</script>

<nav class="bottom-nav">
  {#each tabs as tab}
    {@const active = $page.url.pathname === tab.href}
    <a href={tab.href} class="tab" class:active>
      <span class="icon">
        {#if tab.id === 'home'}
          <Home     size={24} strokeWidth={active ? 2.2 : 1.6} />
        {:else if tab.id === 'security'}
          <Shield   size={24} strokeWidth={active ? 2.2 : 1.6} />
        {:else if tab.id === 'music'}
          <Music    size={24} strokeWidth={active ? 2.2 : 1.6} />
        {:else}
          <SlidersHorizontal size={24} strokeWidth={active ? 2.2 : 1.6} />
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
    gap: 3px;
    text-decoration: none;
    color: var(--color-text-tertiary);
    transition: color 300ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .tab.active {
    color: var(--color-accent-blue);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .label {
    font-size: var(--type-caption);
    font-weight: 500;
    letter-spacing: 0.01em;
  }
</style>
