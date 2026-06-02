<script lang="ts">
  import { Music2 }       from 'lucide-svelte';
  import NowPlayingHero   from '$lib/components/music/NowPlayingHero.svelte';
  import QuickStartRow    from '$lib/components/music/QuickStartRow.svelte';
  import BrowseArea       from '$lib/components/music/BrowseArea.svelte';
  import CastPicker       from '$lib/components/music/CastPicker.svelte';
  import { musicState }   from '$lib/stores/musicState.svelte.js';
</script>

<div class="music-page">

  <!-- Section header -->
  <div class="section-header">
    <span class="section-icon"><Music2 size={32} strokeWidth={1.4} /></span>
    <div class="section-titles">
      <h1 class="section-title">Music</h1>
      <p class="section-sub">Universal media controller</p>
    </div>
  </div>

  <!-- 1. Now Playing hero (~45% height) -->
  <div class="zone zone-hero">
    <div class="hero-card">
      <NowPlayingHero player={musicState.active} />
    </div>
  </div>

  <!-- 2. Quick Start row (~15% height) -->
  <div class="zone zone-quick">
    <div class="zone-label">
      <span>Quick Start</span>
    </div>
    <div class="quick-wrap">
      <QuickStartRow />
    </div>
  </div>

  <!-- 3. Browse area (remaining ~30% height) -->
  <div class="zone zone-browse">
    <BrowseArea />
  </div>

</div>

<!-- Cast picker overlay — portal-like; renders above everything -->
<CastPicker />

<style>
  .music-page {
    height: 100%;
    display: grid;
    grid-template-rows: auto 45fr 17fr 28fr;
    gap: clamp(6px, 0.8vh, 12px);
    padding: clamp(4px, 0.5vh, 8px) 5vw clamp(6px, 0.7vh, 10px);
    overflow: hidden;
    box-sizing: border-box;
  }

  /* ── Section header ── */
  .section-header {
    display: flex; align-items: center; gap: 0.7rem;
  }

  .section-icon {
    display: flex; align-items: center;
    color: var(--color-accent-music); flex-shrink: 0;
  }

  .section-titles { display: flex; flex-direction: column; gap: 0.1em; }

  .section-title {
    font-size: clamp(28px, 2.78vw, 40px);
    font-weight: 600; color: var(--color-text-primary);
    margin: 0; letter-spacing: -0.02em; line-height: 1;
  }

  .section-sub {
    font-size: var(--type-label); font-weight: 500;
    color: var(--color-text-tertiary);
    text-transform: uppercase; letter-spacing: 0.07em; margin: 0;
  }

  /* ── Zones ── */
  .zone { min-height: 0; overflow: hidden; }

  /* Hero card — surface tile with shadow */
  .hero-card {
    height: 100%;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 28px;
    box-shadow: inset 0 1px 0 var(--color-highlight);
    padding: clamp(12px, 1.4vh, 20px) clamp(14px, 1.6vw, 24px);
    overflow: hidden;
  }

  /* Quick start zone */
  .zone-quick {
    display: flex; flex-direction: column; gap: 4px;
  }

  .zone-label {
    font-size: var(--type-label); font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0.2rem; flex-shrink: 0;
  }

  .quick-wrap { flex: 1; min-height: 0; }

  /* Browse zone */
  .zone-browse { overflow: visible; }
</style>
