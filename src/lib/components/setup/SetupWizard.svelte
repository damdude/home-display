<script lang="ts">
  import { fly, fade }              from 'svelte/transition';
  import { onMount }                from 'svelte';
  import { configStore }            from '$lib/stores/configStore.svelte.js';
  import StepChooseRoom             from './steps/StepChooseRoom.svelte';
  import StepChooseTabs             from './steps/StepChooseTabs.svelte';
  import StepHomeWidgets            from './steps/StepHomeWidgets.svelte';
  import StepHomeEntities           from './steps/StepHomeEntities.svelte';
  import StepSecurityConfig         from './steps/StepSecurityConfig.svelte';
  import StepZonesConfig            from './steps/StepZonesConfig.svelte';
  import StepDone                   from './steps/StepDone.svelte';

  interface Props { onComplete: () => void; }
  let { onComplete }: Props = $props();

  // Brief loading gate so entity lists have time to populate before wizard appears
  let wizardReady = $state(false);
  onMount(() => {
    const t = setTimeout(() => { wizardReady = true; }, 1500);
    return () => clearTimeout(t);
  });

  let form = $state({
    roomName:      '',
    tabs:          ['home', 'security', 'music', 'zones'] as string[],
    homeWidgets:   ['weather', 'calendar', 'climate', 'quick_actions', 'now_playing'] as string[],
    homeEntities:  { weather: '', calendar: '', climate: '', tempSensor: '', humSensor: '' },
    cameras:       [] as string[],
    alarm:         '',
    hiddenAreaIds: [] as string[],
  });

  type StepId = 'room' | 'tabs' | 'home_widgets' | 'home_entities' | 'security' | 'zones' | 'done';

  let steps = $derived.by<StepId[]>(() => {
    const s: StepId[] = ['room', 'tabs'];
    if (form.tabs.includes('home')) {
      s.push('home_widgets');
      if (form.homeWidgets.length > 0) s.push('home_entities');
    }
    if (form.tabs.includes('security')) s.push('security');
    if (form.tabs.includes('zones'))    s.push('zones');
    s.push('done');
    return s;
  });

  let stepIndex = $state(0);
  let direction = $state(1);   // 1 = forward, -1 = back
  let saving    = $state(false);

  let currentStep = $derived(steps[stepIndex]);
  let progress    = $derived(Math.round((stepIndex / (steps.length - 1)) * 100));

  function next() {
    if (stepIndex < steps.length - 1) { direction = 1; stepIndex++; }
  }

  function back() {
    if (stepIndex > 0) { direction = -1; stepIndex--; }
  }

  async function launch() {
    saving = true;
    try {
      await configStore.complete({
        roomName:      form.roomName,
        tabs:          form.tabs,
        homeWidgets:   form.homeWidgets,
        homeEntities: {
          weather:    form.homeEntities.weather    || null,
          calendar:   form.homeEntities.calendar   || null,
          climate:    form.homeEntities.climate    || null,
          tempSensor: form.homeEntities.tempSensor || null,
          humSensor:  form.homeEntities.humSensor  || null,
        },
        cameras:       form.cameras,
        alarm:         form.alarm,
        hiddenAreaIds: form.hiddenAreaIds,
      });
      onComplete();
    } catch (e) {
      console.error('[Wizard] Launch failed:', e);
      saving = false;
    }
  }
</script>

<div class="wizard" transition:fade={{ duration: 300 }}>

  {#if !wizardReady}
    <div class="loading-screen" transition:fade={{ duration: 200 }}>
      <div class="spinner"></div>
      <p>Setting up your dashboard…</p>
    </div>
  {:else}
    <!-- Progress bar -->
    <div class="progress-bar">
      <div class="progress-fill" style:width="{progress}%"></div>
    </div>

    <!-- Stable wrapper — never transitions, establishes positioning context -->
    <div class="step-wrap">
      <!-- Keyed inner — both in+out are absolute so they overlap perfectly -->
      {#key currentStep}
        <div
          class="step-inner"
          in:fly={{ x: direction * 40, duration: 220, opacity: 1 }}
          out:fly={{ x: direction * -40, duration: 180, opacity: 1 }}
        >
          {#if currentStep === 'room'}
            <StepChooseRoom bind:value={form.roomName} onContinue={next} />

          {:else if currentStep === 'tabs'}
            <StepChooseTabs bind:value={form.tabs} onBack={back} onContinue={next} />

          {:else if currentStep === 'home_widgets'}
            <StepHomeWidgets bind:value={form.homeWidgets} onBack={back} onContinue={next} />

          {:else if currentStep === 'home_entities'}
            <StepHomeEntities
              widgets={form.homeWidgets}
              bind:value={form.homeEntities}
              onBack={back}
              onContinue={next}
            />

          {:else if currentStep === 'security'}
            <StepSecurityConfig
              bind:cameras={form.cameras}
              bind:alarm={form.alarm}
              onBack={back}
              onContinue={next}
            />

          {:else if currentStep === 'zones'}
            <StepZonesConfig
              bind:hiddenAreaIds={form.hiddenAreaIds}
              onBack={back}
              onContinue={next}
            />

          {:else if currentStep === 'done'}
            <StepDone roomName={form.roomName} tabs={form.tabs} {saving} onLaunch={launch} />
          {/if}
        </div>
      {/key}
    </div>

    <div class="step-counter">{stepIndex + 1} / {steps.length}</div>
  {/if}

</div>

<style>
  .wizard {
    position: fixed; inset: 0; z-index: 300;
    background: #000;
    display: flex; flex-direction: column;
    overflow: hidden;
    isolation: isolate;   /* prevents compositing flash with underlying layers */
  }

  /* Loading screen */
  .loading-screen {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 24px; color: rgba(255,255,255,0.6);
    font-size: clamp(14px, 1.8vw, 18px);
  }
  .loading-screen p { margin: 0; }

  .spinner {
    width: 40px; height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: rgba(255,255,255,0.7);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Progress bar */
  .progress-bar {
    height: 3px; background: rgba(255,255,255,0.08); flex-shrink: 0;
  }
  .progress-fill {
    height: 100%;
    background: rgba(255,255,255,0.7);
    transition: width 350ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Stable outer wrapper — never transitions, clips sliding content */
  .step-wrap {
    flex: 1; min-height: 0;
    position: relative;
    background: #000;
    overflow: hidden;
  }

  /* Inner keyed div — both in+out are absolute so they overlap perfectly.
     Does NOT scroll itself — each step's own .step-body owns its scroll
     region. A scrollable ancestor here would steal the touch-scroll
     gesture from the step's internal list, since the touchscreen's
     gesture recognizer picks the nearest scrollable container — which,
     with nothing to scroll itself, falls back to text-selection drag. */
  .step-inner {
    position: absolute; inset: 0;
    background: #000;
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  /* Steps fill step-inner */
  .step-wrap :global(.step) {
    height: 100%; flex: 1; min-height: 0;
  }

  .step-counter {
    position: absolute; bottom: 16px; right: 20px;
    font-size: 12px; color: rgba(255,255,255,0.3);
    pointer-events: none; z-index: 1;
  }
</style>
