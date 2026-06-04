# Home Display — Project Context

## What this is
A custom SvelteKit 5 (Svelte 5 runes) dashboard for a wall-mounted Raspberry Pi display. Integrates with Home Assistant via server-side WebSocket. Apple-inspired dark mode design. Four tabs: Home, Security, Music, Zones.

## Hardware
- Raspberry Pi 4 Model B, 4GB RAM, aarch64, Debian 13 (Trixie)
- External monitor at 1440×2560 portrait (wlr-randr transform 270 under labwc/Wayland)
- Pi is headless — accessed only via SSH from Mac (user: dash @ 192.168.7.21)
- Target production display (deferred): Waveshare 10.1" DSI at 1280×800, portrait, touchscreen

## Network
- eero Pro 6 router, all devices on 192.168.7.0/24
- Home Assistant (HAOS VM on TrueNAS SCALE) at 192.168.7.39:8123
- Pi at 192.168.7.21
- HomeBase 2 (Eufy cameras) at 192.168.7.234

## Development workflow
- Code lives on Mac at ~/Documents/Claude/Projects/Dashboard/
- Mac is for editing only — never run npm on Mac
- Pi runs all npm commands (install, dev, build)
- Sync to Pi: `bash scripts/deploy.sh --update` from Mac
- Pi path: /home/dash/home-display/
- View from Mac browser: http://192.168.7.21:5173
- Git repo: https://github.com/damdude/home-display (public)
- Two systemd services: `home-display` (SvelteKit dev server, port 5173) and `home-display-kiosk` (Chromium kiosk)
- Chromium kiosk MUST use `--ozone-platform=wayland` flag (critical — omitting it silently fails)

## Tech stack
- SvelteKit 2 + TypeScript + Svelte 5 runes ($state, $derived, $effect, $props)
- Tailwind CSS (utility classes only — no custom config used heavily)
- home-assistant-js-websocket for server-side HA WebSocket
- Lucide Svelte for icons
- HLS.js for camera streams (fullscreen only)

## Design tokens (app.css)
- Background: `#0A0A0C` (`--color-canvas`)
- Surfaces: `#1A1A1F` (`--color-surface-1`), `#232328` (`--color-surface-2`)
- Accents: sage `#6B9B7D` (safe/on), wheat `#A89876` (alert), deep red `#C66B6B` (triggered)
- Music accent: `var(--color-accent-music)` (purple ~`#9B7BB5`)
- Apple easing: `cubic-bezier(0.32, 0.72, 0, 1)` for all transitions
- Type scale: clock 96px, hero 36–44px, body 22–26px (wall display viewing distance)

## Architecture — data flow
```
HA WebSocket (server-side, authenticated)
  → /api/ha SSE          → haStore (client reactive state)
  → /api/zones SSE       → zonesStore (area/floor/entity registry)
  → /api/camera/[entityId] → camera snapshot proxy
  → /api/artwork?path=   → HA media proxy
  → /api/ha/action POST  → service call proxy
  → /api/music/browse POST → MA browse proxy
```
HA_TOKEN lives in `.env` only — never in client-side code.

## Key files
- `src/routes/+layout.svelte` — shell, SSE startup, screensaver trigger, status pills
- `src/lib/stores/ha.svelte.ts` — reactive entity store, callHaService()
- `src/lib/stores/musicState.svelte.ts` — active player resolution
- `src/lib/stores/zonesStore.svelte.ts` — zone/floor registry from SSE
- `src/lib/music/playerResolution.ts` — groups media_player entities, decodes capabilities
- `src/lib/server/ha/connection.ts` — singleton HA WebSocket, broadcast to SSE subscribers
- `src/lib/server/ha/zones.ts` — fetches area/device/entity/floor registries

## Svelte 5 critical rules
- NEVER use `state` as a variable or prop name — conflicts with `$state` rune
- Event modifiers like `onclick|stopPropagation` are INVALID — use `onclick={(e) => { e.stopPropagation(); ... }}`
- Props use `$props()`, reactive state uses `$state()`, derived uses `$derived()`
- Stores are reactive objects with getters, not Svelte 3 writable() stores

## ProgressBar prop name
The `ProgressBar` component uses `playbackState` (NOT `state`) as the prop name for the player state string. This was renamed to avoid the Svelte 5 `$state` rune conflict. All callers must pass `playbackState={...}`.

## Home Assistant setup
- HAOS on TrueNAS SCALE VM, HA Core 2026.5.4
- 5 Eufy cameras (Cam 2C / 2C Pro) via HomeBase 2 → RTSP → Generic Camera integration
  - RTSP format: `rtsp://USER:PASS@192.168.7.234/liveN`
- Wyze Doorbell v1 — deferred (DTLS handshake failures with Wyze Bridge)
- Music Assistant Server add-on installed, Radio Browser + Google Cast + AirPlay providers
- Ecobee thermostat at `climate.living_room_thermostat`

## Media player entities (Music tab)
Resolution pattern: group by friendly_name, prefer MA-managed (`mass_player_type` attribute) as control entity, AirPlay receivers (`com.apple.TV` app_id) as state-only.

| Entity | Role | Display name |
|---|---|---|
| `media_player.maindoor_speaker_2` | MA control | Maindoor Speaker |
| `media_player.second_speaker_2` | MA control | Second Speaker |
| `media_player.bbox` | MA control | Apple TV |
| `media_player.bbox_3` | AirPlay state-only | — |
| `media_player.nritya_kala_kendra` | Hidden (unpaired) | — |
| `media_player.tmacbook` | Hidden | — |
| `media_player.music_assistant` | Hidden | — |

## Zone/area setup
Floors: Ground Floor (`ground_floor`), 1st Floor (`1st_floor`)

| Area ID | Floor | Devices |
|---|---|---|
| `living_room` | ground | Ecobee thermostat, Maindoor Speaker, Apple TV (BBOX) |
| `kids_room` | 1st | Second Speaker |
| `outdoor` | (none) | Outdoor lights switch, 5 Eufy cameras |
| `home` | (none) | Security system (Envisalink/DSC), alarm panel |
| `garage` | ground | NRITYA KALA KENDRA (hidden — Apple TV, unpaired) |
| `kitchen`, `master_room`, etc. | various | Empty — no devices yet |

HIDDEN_AREA_IDS = ['garage'] in zonesStore.

## Phases complete
- Phase 0: SvelteKit scaffold, HA WebSocket, systemd kiosk
- Phase 1: Home tab — clock, weather, calendar, climate tile, sensor pills, now-playing tile, quick actions
- Phase 1b: Live HA data via server-side WebSocket + SSE
- Phase 2: Bottom nav routing with crossfade transitions
- Phase 3: Security tab — adaptive camera grid (1–6 cameras), snapshot refresh, fullscreen HLS, alarm panel, recent activity
- Phase 4: Zones tab — floor-grouped zone cards, chip-based device controls, climate inline expand, camera overlay
- Phase 5: Music tab — Apple Music-style full player, CarPlay mini player on Home tab, shared CastPicker, Music Screensaver

## Phases remaining
- Phase 6: General screensaver (B&W time/weather when idle, no music)
- Phase 7: Admin login + per-instance device permissions
- Phase 8: Polish (animations, error states, offline handling)
- Phase 9: Production hardening (Waveshare DSI display, touch calibration, auto-recovery)

## Known deferred items
- Wyze Doorbell v1 integration (DTLS handshake fails with current firmware)
- Second Apple TV (NRITYA KALA KENDRA) — needs remote to enter pairing PIN
- HLS streaming in Security tab fullscreen (TODO Phase 3b — M3U8 proxy needed)
- Multi-speaker grouping in CastPicker (bitmask supports it, UI not wired)
- Daily Mix quick start tile (greyed — needs MA playlist integration)

## Security notes
- HA_TOKEN never in client code — all proxied through /api/* server routes
- Camera proxy validates entity_id starts with 'camera.'
- Artwork proxy validates path starts with '/'
- Action proxy has domain allowlist (media_player, climate, switch, light, alarm_control_panel, cover, fan, input_boolean, scene, script, automation)
- Camera proxy has 500ms rate limit per entity
- TRIGGERED_DEMO must be false in production
