<script lang="ts">
  import { Lightbulb, ShieldCheck, Tv2, Fan } from 'lucide-svelte';
  import QuickShortcut from './QuickShortcut.svelte';
  import { cv } from '$lib/design/tokens.js';
</script>

<div class="row">
  <QuickShortcut label="Outdoor Lights" color={cv.accent.light}>
    <Lightbulb size={26} strokeWidth={1.5} />
  </QuickShortcut>

  <QuickShortcut label="Arm Security" color={cv.accent.climate}>
    <ShieldCheck size={26} strokeWidth={1.5} />
  </QuickShortcut>

  <QuickShortcut label="Living Room TV" color={cv.accent.info}>
    <Tv2 size={26} strokeWidth={1.5} />
  </QuickShortcut>

  <QuickShortcut label="Fan" color={cv.accent.safe}>
    <Fan size={26} strokeWidth={1.5} />
  </QuickShortcut>
</div>

<style>
  .row {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-around;
  }
</style>
