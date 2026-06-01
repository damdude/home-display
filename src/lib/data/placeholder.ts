/**
 * Placeholder entity data for Phase 1 (static).
 *
 * Every shape here matches exactly what the HA WebSocket returns for that
 * entity domain. Phase 1b replaces these values with live state — components
 * never change.
 */

// ── Demo flags ──────────────────────────────────────────────────────────────
/** Flip to true to preview Music zone State B (now-playing) */
export const MUSIC_DEMO_PLAYING = false;
/** Flip to true to preview triggered security pill animation */
export const TRIGGERED_DEMO = false;

// ── Status pill types ───────────────────────────────────────────────────────

export type PillIconId =
  | 'shield-check' | 'shield-alert' | 'shield' | 'shield-off'
  | 'door-open' | 'door-closed'
  | 'lightbulb';

export interface PillDescriptor {
  id:           string;
  iconId:       PillIconId;
  label:        string;
  status:       string;
  /** CSS color reference for the dot, e.g. 'var(--color-accent-safe)' */
  dotColor:     string;
  /** When true: status text renders at full opacity in --color-accent-triggered */
  isAlert:      boolean;
  /** When true: pill applies continuous triggeredPulse animation */
  isTriggered?: boolean;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  summary: string;
  /** ISO datetime string (timed) or YYYY-MM-DD (all-day). */
  start: string;
  /** ISO datetime string (timed) or YYYY-MM-DD (all-day). */
  end: string;
  allDay: boolean;
  /** Event description/notes from the calendar provider. May contain newlines. */
  description?: string | null;
  /** Physical location string, if the organiser set one. */
  location?: string | null;
}

export interface WeatherForecastDay {
  datetime: string;
  condition: string;
  temperature: number;
  templow: number;
}

export interface WeatherState {
  state: string;
  attributes: {
    temperature: number;
    temperature_unit: string;
    humidity: number;
    forecast: WeatherForecastDay[];
  };
}

export interface ClimateState {
  state: 'heat' | 'cool' | 'heat_cool' | 'auto' | 'off';
  attributes: {
    current_temperature: number;
    /** Single setpoint — present in heat and cool modes */
    temperature?: number;
    /** Lower bound — present in heat_cool / auto modes */
    target_temp_low: number;
    /** Upper bound — present in heat_cool / auto modes */
    target_temp_high: number;
    hvac_action: string;
  };
}

export interface BinarySensorState {
  state: 'on' | 'off'; // 'on' = open/triggered, 'off' = closed/clear
  attributes: {
    device_class: string;
    friendly_name: string;
  };
}

export interface AlarmState {
  state: 'disarmed' | 'armed_home' | 'armed_away' | 'triggered';
  attributes: {
    friendly_name: string;
  };
}

export interface MediaPlayerState {
  state: string;
  attributes: {
    media_title: string | null;
    media_artist: string | null;
    entity_picture: string | null;
  };
}

// ── Entities ────────────────────────────────────────────────────────────────

export const weatherForecastHome: WeatherState = {
  state: 'partlycloudy',
  attributes: {
    temperature: 68,
    temperature_unit: '°F',
    humidity: 54,
    forecast: [
      { datetime: '2024-01-15T12:00:00+00:00', condition: 'sunny',        temperature: 72, templow: 58 },
      { datetime: '2024-01-16T12:00:00+00:00', condition: 'partlycloudy', temperature: 69, templow: 55 },
      { datetime: '2024-01-17T12:00:00+00:00', condition: 'cloudy',       temperature: 65, templow: 52 },
      { datetime: '2024-01-18T12:00:00+00:00', condition: 'rainy',        temperature: 61, templow: 50 },
      { datetime: '2024-01-19T12:00:00+00:00', condition: 'rainy',        temperature: 58, templow: 48 },
      { datetime: '2024-01-20T12:00:00+00:00', condition: 'partlycloudy', temperature: 63, templow: 51 },
      { datetime: '2024-01-21T12:00:00+00:00', condition: 'sunny',        temperature: 70, templow: 56 },
    ],
  },
};

export const climateLivingRoomThermostat: ClimateState = {
  state: 'cool',
  attributes: {
    current_temperature: 72,
    target_temp_low: 68,
    target_temp_high: 75,
    hvac_action: 'idle',
  },
};

export const binarySensorMainDoor: BinarySensorState = {
  state: 'off',
  attributes: { device_class: 'door', friendly_name: 'Main Door' },
};

export const binarySensorSideDoor: BinarySensorState = {
  state: 'off',
  attributes: { device_class: 'door', friendly_name: 'Side Door' },
};

export const binarySensorBackPerimeter: BinarySensorState = {
  state: 'off',
  attributes: { device_class: 'door', friendly_name: 'Back Perimeter' },
};

export const binarySensorFrontSidePerimeter: BinarySensorState = {
  state: 'off',
  attributes: { device_class: 'door', friendly_name: 'Front-Side Perimeter' },
};

export const alarmSecurityPartition1: AlarmState = {
  state: 'disarmed',
  attributes: { friendly_name: 'Home Security' },
};

export const mediaPlayerMaindoorSpeaker: MediaPlayerState = {
  state: 'off',
  attributes: {
    media_title: null,
    media_artist: null,
    entity_picture: null,
  },
};

/** Demo playing state — used when MUSIC_DEMO_PLAYING is true */
export const mediaPlayerDemoPlaying: MediaPlayerState = {
  state: 'playing',
  attributes: {
    media_title: 'Something',
    media_artist: 'The Beatles',
    entity_picture: null,
  },
};
