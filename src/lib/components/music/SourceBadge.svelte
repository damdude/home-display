<script lang="ts">
  interface Props {
    appName: string | null;
    appId:   string | null;
  }
  let { appName, appId }: Props = $props();

  interface Source { label: string; color: string; bg: string; }

  function resolve(name: string | null, id: string | null): Source | null {
    const n = (name ?? '').toLowerCase();
    const i = (id   ?? '').toLowerCase();
    if (!n && !i) return null;

    if (n.includes('spotify')  || i.includes('spotify'))
      return { label: 'Spotify',        color: '#1DB954', bg: 'rgba(29,185,84,0.13)'  };
    if (n.includes('amazon')   || i.includes('amazon') || n.includes('amzn'))
      return { label: 'Amazon Music',   color: '#FF9900', bg: 'rgba(255,153,0,0.13)'  };
    if (n.includes('apple music') || i.includes('music.apple'))
      return { label: 'Apple Music',    color: '#FC3C44', bg: 'rgba(252,60,68,0.12)'  };
    if (n.includes('youtube music') || i.includes('youtubemusic'))
      return { label: 'YouTube Music',  color: '#FF0000', bg: 'rgba(255,0,0,0.11)'    };
    if (n.includes('youtube')  || i.includes('youtube'))
      return { label: 'YouTube',        color: '#FF0000', bg: 'rgba(255,0,0,0.11)'    };
    if (n.includes('music assistant') || n.includes('mass') || i.includes('mass'))
      return { label: 'Music Asst.',    color: '#9B7BB5', bg: 'rgba(155,123,181,0.13)'};
    if (n.includes('netflix')  || i.includes('netflix'))
      return { label: 'Netflix',        color: '#E50914', bg: 'rgba(229,9,20,0.11)'   };
    if (n.includes('plex')     || i.includes('plex'))
      return { label: 'Plex',           color: '#E5A00D', bg: 'rgba(229,160,13,0.12)' };
    // Anything else — show cleaned-up name
    return {
      label: name ?? id ?? 'Media',
      color: 'var(--color-text-tertiary)',
      bg:    'var(--color-surface-2)',
    };
  }

  let source = $derived(resolve(appName, appId));
</script>

{#if source}
  <span
    class="badge"
    style="--badge-color:{source.color};--badge-bg:{source.bg}"
  >{source.label}</span>
{/if}

<style>
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: clamp(11px, 0.97vw, 14px);
    font-weight: 600;
    letter-spacing: 0.025em;
    white-space: nowrap;
    line-height: 1.6;
    /* Use CSS vars so parent can override via :global if needed */
    color:      var(--badge-color);
    background: var(--badge-bg);
  }
</style>
