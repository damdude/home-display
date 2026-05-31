<script lang="ts">
  import { Music2 } from 'lucide-svelte';
</script>

<div class="section">
  <div class="section-header">
    <span class="section-icon"><Music2 size={40} strokeWidth={1.4} /></span>
    <h1 class="section-title">Music</h1>
  </div>
  <p class="section-body">Music playback and casting — coming in Phase 5</p>
</div>

<style>
  .section {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 2rem 5vw;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--color-accent-info);
  }

  .section-icon {
    display: flex;
    align-items: center;
  }

  .section-title {
    font-size: clamp(36px, 3.33vw, 48px);
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .section-body {
    font-size: var(--type-body);
    color: var(--color-text-tertiary);
    margin: 0;
    text-align: center;
    opacity: 0.7;
  }
</style>
