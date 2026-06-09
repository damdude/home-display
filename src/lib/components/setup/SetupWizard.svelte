<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { onMount }               from 'svelte';
  import { configStore }           from '$lib/stores/configStore.svelte.js';
  import StepChooseRoom            from './steps/StepChooseRoom.svelte';
  import StepChooseTabs            from './steps/StepChooseTabs.svelte';
  import StepHomeWidgets           from './steps/StepHomeWidgets.svelte';
  import StepHomeEntities          from './steps/StepHomeEntities.svelte';
  import StepSecurityConfig        from './steps/StepSecurityConfig.svelte';
  import StepZonesConfig           from './steps/StepZonesConfig.svelte';
  import StepDone                  from './steps/StepDone.svelte';

  interface Props { onComplete: () => void; }
  let { onComplete }: Props = $props();

  // Brief loading gate so the wizard doesn't flicker in before HA is ready
  let wizardReady = $state(false);
  onMount(() => {
    // Give HA connection 1.5 seconds to initialise entity lists,
    // then show the wizard regardless
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
  let saving    = $state(false);
  let direction = $state(1);

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
        roomName:     form.roomName,
        tabs:         form.tabs,
        homeWidgets:  form.homeWidgets,
        homeEntities: {
          weather:    form.homeEntities.weather    || null,
          calendar:   form.homeEntities.calendar   || null,
          climate:    form.homeEntities.climate    || null,
          tempSensor: form.homeEntities.tempSensor || null,
          humSensor:  form.homeEntities.humSensor  || null,
        },
        cameras:      form.cameras,
        alarm:        form.alarm,
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
    <!-- Loading screen shown while Pi restarts / HA connects -->
    <div class="loading-screen" transition:fade={{ duration: 200 }}>
      <div class="spinner"></div>
      <p>Setting up your dashboard…</p>
    </div>
  {:else}
    <!-- Progress bar -->
    <div class="progress-bar">
      <div class="progress-fill" style:width="{progress}%"></div>
    </div>

    <!-- Step content -->
    {#key currentStep}
      <div
        class="step-wrap"
        in:fly={{ x: direction * 60, duration: 280, opacity: 0 }}
        out:fly={{ x: direction * -60, duration: 200, opacity: 0 }}
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
          <StepDone
            roomName={form.roomName}
            tabs={form.tabs}
            {saving}
            onLaunch={launch}
          />
        {/if}
      </div>
    {/key}

    <!-- Step counter -->
    <div class="step-counter">{stepIndex + 1} / {steps.length}</div>
  {/if}

</div>

<style>
  .wizard {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: #000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Loading screen */
  .loading-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    color: rgba(255,255,255,0.6);
    font-size: clamp(14px, 1.8vw, 18px);
  }

  .loading-screen p { margin: 0; }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: rgba(255,255,255,0.7);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Progress bar */
  .progress-bar {
    height: 3px;
    background: rgba(255,255,255,0.08);
    flex-shrink: 0;
  }

  .progress-fill {
    height: 100%;
    background: rgba(255,255,255,0.7);
    transition: width 350ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Step wrapper */
  .step-wrap {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .step-wrap :global(.step) {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .step-wrap :global(.step::-webkit-scrollbar) { display: none; }

  .step-counter {
    position: absolute;
    bottom: 16px;
    right: 20px;
    font-size: 12px;
    color: rgba(255,255,255,0.3);
    pointer-events: none;
    z-index: 1;
  }
</style>
