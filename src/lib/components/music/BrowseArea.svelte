<script lang="ts">
  /**
   * Music Assistant browse area.
   *
   * Shows radio / library / podcast content from MA. Calls /api/music/browse
   * (which proxies the HA media_player/browse_media WebSocket message).
   *
   * Gracefully degrades when MA is not installed or no providers are added.
   *
   * Category chips at top → content grid below (2-column, scrollable).
   */
  import { onMount } from 'svelte';
  import { Radio, Library, Mic, Heart } from 'lucide-svelte';
  import { musicState } from '$lib/stores/musicState.svelte.js';
  import { callHaService } from '$lib/stores/ha.svelte.js';

  interface BrowseItem {
    title:              string;
    thumbnail?:         string | null;
    media_content_id:   string;
    media_content_type: string;
    can_play:           boolean;
    can_expand:         boolean;
  }

  type Category = 'radio' | 'library' | 'podcasts' | 'favorites';

  const CATS: { id: Category; label: string; icon: typeof Radio }[] = [
    { id: 'radio',     label: 'Radio',     icon: Radio   },
    { id: 'library',   label: 'Library',   icon: Library },
    { id: 'podcasts',  label: 'Podcasts',  icon: Mic     },
    { id: 'favorites', label: 'Favorites', icon: Heart   },
  ];

  // Content-type roots per category (MA URIs)
  const ROOTS: Record<Category, { type: string; id: string }> = {
    radio:     { type: 'library',  id: 'library://radio'     },
    library:   { type: 'library',  id: 'library://music'     },
    podcasts:  { type: 'library',  id: 'library://podcasts'  },
    favorites: { type: 'favorites',id: 'favorites://'        },
  };

  let activeCategory = $state<Category>('radio');
  let items          = $state<BrowseItem[]>([]);
  let loading        = $state(false);
  let unavailable    = $state(false);

  // Pick the first MA-capable player for browsing
  let maPlayer = $derived(
    musicState.players.find(p => p.isMaManaged && p.caps.canBrowse)
    ?? musicState.players.find(p => p.caps.canBrowse)
    ?? null,
  );

  async function loadCategory(cat: Category) {
    if (!maPlayer) { unavailable = true; return; }
    loading = true; unavailable = false;

    try {
      const root = ROOTS[cat];
      const res  = await fetch('/api/music/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId:          maPlayer.controlId,
          mediaContentId:    root.id,
          mediaContentType:  root.type,
        }),
      });
      const data = await res.json() as { children?: BrowseItem[] };
      items = data.children ?? [];
      if (!items.length) unavailable = true;
    } catch {
      unavailable = true; items = [];
    } finally {
      loading = false;
    }
  }

  function selectCat(cat: Category) {
    activeCategory = cat;
    void loadCategory(cat);
  }

  function playItem(item: BrowseItem) {
    if (!item.can_play) return;
    const target = musicState.active?.controlId ?? maPlayer?.controlId;
    if (!target) return;
    callHaService('media_player', 'play_media', {
      entity_id:          target,
      media_content_id:   item.media_content_id,
      media_content_type: item.media_content_type,
    });
  }

  onMount(() => { void loadCategory(activeCategory); });

  // Reload when maPlayer first appears
  $effect(() => {
    if (maPlayer && items.length === 0 && !loading) {
      void loadCategory(activeCategory);
    }
  });
</script>

<div class="browse">
  <!-- Category chips -->
  <div class="chips" role="tablist">
    {#each CATS as cat}
      <button
        class="chip"
        class:active={activeCategory === cat.id}
        role="tab"
        aria-selected={activeCategory === cat.id}
        onclick={() => selectCat(cat.id)}
      >
        <cat.icon size={13} strokeWidth={2} />
        {cat.label}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class="content">
    {#if !maPlayer && !loading}
      <p class="empty">
        Install Music Assistant and add providers to enable browsing.
      </p>
    {:else if loading}
      <p class="empty">Loading…</p>
    {:else if unavailable || !items.length}
      <p class="empty">No content available. Add providers in Music Assistant settings.</p>
    {:else}
      <div class="grid">
        {#each items as item (item.media_content_id)}
          <button
            class="item"
            disabled={!item.can_play}
            onclick={() => playItem(item)}
            aria-label={item.title}
          >
            {#if item.thumbnail}
              <img src={item.thumbnail} alt="" class="thumb" />
            {:else}
              <div class="thumb-placeholder">
                <Radio size={24} strokeWidth={1.4} />
              </div>
            {/if}
            <span class="item-name">{item.title}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .browse {
    height: 100%; display: flex; flex-direction: column; gap: 0.4rem;
  }

  /* Category chips */
  .chips {
    display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap;
  }

  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 13px; border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    font-size: clamp(12px, 1.04vw, 15px); font-weight: 500;
    cursor: pointer;
    transition: background 150ms, border-color 150ms, color 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .chip.active {
    background: color-mix(in srgb, var(--color-accent-music) 16%, var(--color-surface-2));
    border-color: color-mix(in srgb, var(--color-accent-music) 40%, transparent);
    color: var(--color-accent-music);
  }

  /* Content area */
  .content {
    flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none;
  }
  .content::-webkit-scrollbar { display: none; }

  .empty {
    font-size: clamp(13px, 1.11vw, 16px);
    color: var(--color-text-tertiary); opacity: 0.6;
    font-style: italic; text-align: center; margin: 1rem 0; padding: 0;
  }

  /* Item grid */
  .grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: clamp(6px, 0.8vw, 10px);
  }

  .item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 14px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    cursor: pointer; text-align: left;
    transition: background 150ms;
    -webkit-tap-highlight-color: transparent;
  }
  .item:disabled { opacity: 0.4; cursor: default; }
  .item:not(:disabled):active { background: var(--color-surface-3); }

  .thumb {
    width: clamp(36px, 3.5vw, 52px); height: clamp(36px, 3.5vw, 52px);
    border-radius: 8px; object-fit: cover; flex-shrink: 0;
  }

  .thumb-placeholder {
    width: clamp(36px, 3.5vw, 52px); height: clamp(36px, 3.5vw, 52px);
    border-radius: 8px; flex-shrink: 0;
    background: var(--color-surface-3);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-accent-music); opacity: 0.5;
  }

  .item-name {
    font-size: clamp(13px, 1.11vw, 16px); font-weight: 500;
    color: var(--color-text-primary);
    overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    line-height: 1.3;
  }
</style>
