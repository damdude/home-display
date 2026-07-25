<script lang="ts">
  import { page } from '$app/stores';
  import { Home, Shield, Music, LayoutGrid } from 'lucide-svelte';

  interface Props { tabs?: string[]; }
  let { tabs: enabled = [] }: Props = $props();

  const ALL = [
    { href: '/',         label: 'Home',     id: 'home'     },
    { href: '/security', label: 'Security', id: 'security' },
    { href: '/music',    label: 'Music',    id: 'music'    },
    { href: '/zones',    label: 'Zones',    id: 'zones'    },
  ] as const;

  // Show only the tabs chosen in the wizard; fall back to all if config is empty.
  let visible = $derived(
    enabled.length > 0 ? ALL.filter(t => enabled.includes(t.id)) : [...ALL]
  );
</script>

<nav class="bottom-nav">
  {#each visible as tab (tab.id)}
    {@const active = $page.url.pathname === tab.href}
    <a href={tab.href} class="tab" class:active>
      <span class="icon">
        {#if tab.id === 'home'}
          <Home     size={40} strokeWidth={active ? 2.0 : 1.5} />
        {:else if tab.id === 'security'}
          <Shield   size={40} strokeWidth={active ? 2.0 : 1.5} />
        {:else if tab.id === 'music'}
          <Music    size={40} strokeWidth={active ? 2.0 : 1.5} />
        {:else}
          <LayoutGrid size={40} strokeWidth={active ? 2.0 : 1.5} />
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
    height: 104px;                 /* generous, easy to hit */
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0;
    text-decoration: none;
    color: var(--color-text-secondary);
    opacity: 0.6;
    transition: color 300ms cubic-bezier(0.32, 0.72, 0, 1),
                opacity 300ms cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }
  .tab:active { opacity: 0.85; }

  .tab.active {
    color: var(--color-accent-info);
    opacity: 1;
  }

  .tab.active .label {
    font-weight: 600;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .label {
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }
</style>
