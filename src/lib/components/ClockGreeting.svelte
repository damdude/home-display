<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let timeStr    = $state('');
  let greeting   = $state('');
  let interval: ReturnType<typeof setInterval>;

  function update() {
    const now = new Date();
    const h   = now.getHours();
    const m   = now.getMinutes().toString().padStart(2, '0');
    const h12 = h % 12 || 12;

    timeStr = `${h12}:${m}`;

    if      (h < 12) greeting = 'Good morning, Rahul';
    else if (h < 17) greeting = 'Good afternoon, Rahul';
    else             greeting = 'Good evening, Rahul';
  }

  onMount(() => {
    update();
    interval = setInterval(update, 1000);
  });

  onDestroy(() => clearInterval(interval));
</script>

<div class="zone">
  <p class="clock num">{timeStr}</p>
  <p class="greeting">{greeting}</p>
</div>

<style>
  .zone {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15em;
    height: 100%;
  }

  .clock {
    font-size: var(--type-clock);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
    line-height: 1;
    margin: 0;
  }

  .greeting {
    font-size: var(--type-body);
    font-weight: 300;
    color: var(--color-text-secondary);
    margin: 0;
    letter-spacing: 0.01em;
  }
</style>
