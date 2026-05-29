<!--
  AttentionPulse — wrapper component for the attention ring effect.
  For direct tile use, prefer the `use:attentionPulse` action instead.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { attentionPulse } from '$lib/actions/attentionPulse.js';

  let {
    count  = 0,
    color,
    radius = '20px',
    class: className = '',
    children,
  }: {
    count?:    number;
    color:     string;
    radius?:   string;
    class?:    string;
    children?: Snippet;
  } = $props();
</script>

<div
  class="ap {className}"
  use:attentionPulse={{ count, color, radius }}
>
  {@render children?.()}
</div>

<style>
  .ap {
    position: relative;
  }
</style>
