<script>
  import '../../app.css';
</script>

<slot />

<style>
  :global(:root) {
    --color-canvas: #0a0a0c;
    --color-surface-1: #1a1a1f;
    --color-surface-2: #232328;
    --color-text-primary: #ffffff;
    --color-text-secondary: rgba(255, 255, 255, 0.65);
    --color-text-tertiary: rgba(255, 255, 255, 0.45);
    --color-accent-music: #9b7bb5;
  }

  :global(body) {
    margin: 0;
    background: var(--color-canvas);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
</style>
