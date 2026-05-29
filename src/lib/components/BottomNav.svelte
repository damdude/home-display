<script lang="ts">
  import { page } from '$app/stores';
  import { Home, Shield, Music, SlidersHorizontal } from 'lucide-svelte';

  const tabs = [
    { href: '/',         label: 'Home',     icon: Home              },
    { href: '/security', label: 'Security', icon: Shield            },
    { href: '/music',    label: 'Music',    icon: Music             },
    { href: '/controls', label: 'Controls', icon: SlidersHorizontal },
  ] as const;
</script>

<nav class="bottom-nav">
  {#each tabs as tab}
    {@const active = $page.url.pathname === tab.href}
    <a href={tab.href} class="tab" class:active>
      <span class="icon">
        <svelte:component this={tab.icon} size={24} strokeWidth={active ? 2.2 : 1.6} />
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
