<script lang="ts">
  import { Speaker, Check } from 'lucide-svelte';
  import type { ResolvedPlayer } from '$lib/music/playerResolution.js';

  interface Props {
    player:   ResolvedPlayer;
    selected: boolean;
    onclick?: () => void;
  }
  let { player, selected, onclick }: Props = $props();

  function subtitle(p: ResolvedPlayer): string {
    if (p.state === 'playing' && p.media.title) {
      const who = [p.media.title, p.media.artist].filter(Boolean).join(' — ');
      return `Playing: ${who}`;
    }
    if (p.state === 'paused') return 'Paused';
    if (p.state === 'idle')   return 'Idle';
    if (p.state === 'off')    return 'Off';
    return p.state;
  }
</script>

<button class="tile" class:selected {onclick} aria-pressed={selected}>
  <span class="icon">
    <Speaker size={18} strokeWidth={1.5} />
  </span>
  <span class="text">
    <span class="name">{player.name}</span>
    <span class="sub">{subtitle(player)}</span>
  </span>
  {#if selected}
    <span class="check"><Check size={16} strokeWidth={2.5} /></span>
  {/if}
</button>

<style>
  .tile {
    display: flex; align-items: center; gap: 12px;
    width: 100%; padding: 12px 16px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    cursor: pointer; text-align: left;
    transition: background 150ms, border-color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .tile.selected {
    background: color-mix(in srgb, var(--color-accent-music) 12%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--color-accent-music) 35%, transparent);
  }
  .tile:active { background: var(--color-surface-3); }

  .icon {
    color: var(--color-accent-music); opacity: 0.8; flex-shrink: 0;
    display: flex; align-items: center;
  }
  .tile.selected .icon { opacity: 1; }

  .text {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 2px;
  }

  .name {
    font-size: clamp(15px, 1.39vw, 20px);
    font-weight: 500; color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sub {
    font-size: clamp(12px, 1.04vw, 15px);
    color: var(--color-text-tertiary); opacity: 0.7;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .check {
    color: var(--color-accent-music); flex-shrink: 0;
    display: flex; align-items: center;
  }
</style>
