/**
 * Home-tab widget registry. Maps a widget id (as stored in config.homeWidgets)
 * to its component, the HA entities it needs to show live data (for empty
 * states), and the layout size class applied to its wrapping `.zone`.
 *
 * Only the Home tab renders from this. Tab structure stays fixed. Widgets not in
 * this map (e.g. the retired `quick_actions`) are silently skipped by Home.
 */
import type { Component } from 'svelte';
import WeatherStrip    from '$lib/components/WeatherStrip.svelte';
import CalendarTile    from '$lib/components/CalendarTile.svelte';
import ClimateSplit    from '$lib/components/ClimateSplit.svelte';
import MediaNowPlaying from '$lib/components/MediaNowPlaying.svelte';
import type { DashboardConfig } from '$lib/stores/configStore.svelte.js';

export type HomeEntities = DashboardConfig['home']['entities'];

export interface WidgetDef {
  id: string;
  label: string;
  component: Component<any>;
  /** Entity ids that must be present in HA for live data — used for empty state. */
  requiredEntities: (e: HomeEntities) => string[];
  /** Class applied to the wrapping `.zone` — reuses the existing layout heights. */
  sizeClass: string;
}

export const HOME_WIDGET_REGISTRY: Record<string, WidgetDef> = {
  weather: {
    id: 'weather', label: 'Weather', component: WeatherStrip,
    requiredEntities: (e) => (e.weather ? [e.weather] : []),
    sizeClass: 'zone-weather',
  },
  calendar: {
    id: 'calendar', label: 'Calendar', component: CalendarTile,
    // Calendar events arrive globally via the SSE calendar message, not per-entity.
    requiredEntities: () => [],
    sizeClass: 'zone-calendar',
  },
  climate: {
    id: 'climate', label: 'Climate', component: ClimateSplit,
    requiredEntities: (e) => (e.climate ? [e.climate] : []),
    sizeClass: 'zone-climate',
  },
  now_playing: {
    id: 'now_playing', label: 'Now Playing', component: MediaNowPlaying,
    // Resolved from all media_player entities globally (musicState), not one id.
    requiredEntities: () => [],
    sizeClass: 'zone-media',
  },
};
