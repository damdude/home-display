# Project Status — Last Updated: 2026-07-25

## Production Display (CURRENT — the old monitor is retired)
- Waveshare 10.1" DSI, portrait: 800px wide × 1280px tall. This is THE target.
- The external 1440×2560 monitor is RETIRED. All sizing targets 800px width.
- Rotation: wlr-randr transform 270 on HDMI-A-1 under labwc/Wayland.

## ⚠️ Hardware + Architecture Lessons (a fresh session MUST know these)
These were learned the hard way; ignoring them reintroduces already-fixed bugs.

1. **POINTER EVENTS ONLY** — touch events do NOT fire reliably on the Waveshare DSI panel. Chromium falls back to text-selection instead of firing touchstart/touchmove. ALL gesture code uses pointerdown/pointermove/pointerup. See `src/lib/actions/dragScroll.ts` (the canonical example).
2. **Scrolling requires `min-height: 0`** on the flex child that scrolls. Without it a flex child grows to content height and never scrolls. `.shell-main` has it.
3. **Fine-grained reactivity: mutate, don't spread.** In `ha.svelte.ts` the SSE `patch` case does `haStore.entities[id] = state` (direct mutation). Do NOT `haStore.entities = { ...haStore.entities, [id]: state }` — spreading changes the reference and invalidates EVERY `$derived` in the app (major jank on Pi 4).
4. **dragScroll owns scroll AND overscroll.** It ignores pointers that START in the top/bottom edge bands (`EDGE_BAND_TOP=90`, `EDGE_BAND_BOTTOM=150`, exported from dragScroll.ts) so the window-level Control/Notification swipes get those gestures. Do not add competing pointer handlers on `.shell-main`.
5. **All HA proxies use `getActiveCredentials()`** from connection.ts — never raw `env.HA_TOKEN`. After first-time setup the token lives in the runtime override, not necessarily in `env`. Reading `env.HA_TOKEN` directly causes HA "invalid authentication" warnings (this bit zones.ts, camera, artwork, music/browse).
6. **Token hot-reload, no restart.** `/api/setup/test-ha` calls `reconnectWithCredentials(url, token)` on the live WebSocket. It does NOT restart the service (restarting shows the desktop on the kiosk and drops the setup page).
7. **config.json is written ONLY on full wizard completion** via /api/setup/complete.
8. **Mac edits → `bash scripts/deploy.sh --update` → Pi runs.** Never run npm on Mac.
9. **Chromium kiosk MUST pass `--ozone-platform=wayland`** or it silently fails.
10. **Setup wizard is hardcoded black/white** (#000/#fff/#111), not CSS variables, so the dashboard theme can't leak into it.

## COMPLETE ✅ (confirmed working on device this session)

### Setup & onboarding
- QR boot screen → phone /setup (URL + token) → hot-reload → kiosk transitions to wizard
- Setup page survives the connection step (sessionStorage + pageshow guard)
- Full wizard: room → tabs → home widgets → home entities → security → zones → child-lock → done; writes config.json on completion
- Wizard hard-gate: Continue disabled until a step is valid; explicit Skip only where a step is optional; transition-lock prevents rapid-tap step-skipping
- Entity-picker step shows a loading state, then a snapshotted (frozen) list — no freeze, no churn while choosing
- Zones step auth fixed (uses getActiveCredentials); 6s fallback so it never hangs

### Gestures & panels
- Swipe DOWN from top → Control Center (quick actions + child-lock)
- Swipe UP from bottom → Notification Center (new-device/HA-warning notifications + activity log; baseline persisted so restarts don't re-flag every entity)
- Edge affordance bars (subtle gray pills top+bottom hinting the panels)
- Rubber-band overscroll on ALL tabs + pull-to-refresh (pull down at top → HA refresh)
- Child lock: 4–6 digit PIN set in wizard; full-screen PIN-pad overlay swallows all touch when engaged; gestures blocked while locked (UX gate, not hardened security — PIN is plain text in config.json)

### Home tab
- Per-tab status bar: Home shows only ACTIVE sensors (open/on/armed), live-updating; Security shows ALL; Music shows none
- Weather: horizontal 5-day forecast (day/icon/high/low)
- Climate: two tiles, enlarged touch targets
- Calendar: shows ~2 upcoming; collapses to a thin bar when empty
- Now Playing: compact card, artwork with transport controls OVERLAID on it, speaker name shown, no purple; collapses to thin bar when idle
- Quick Actions REMOVED from Home (moved to Control Center)

### Global
- Theme toggle works (removed the duplicate :root in +layout that overrode app.css); persists across reload
- Bell icon removed from TopStrip (notifications now via swipe-up)
- Bigger BottomNav (104px, larger icons/labels); honors config.tabs
- Screensaver: music mode only while playing OR paused < 2 min, else clock mode; full-bleed artwork; notification count badge; idle timeout 15s
- Performance pass: fine-grained entity reactivity, memoized musicState ($derived), debounced new-device check (60s), conditional pause-ticker, keyed {#each} blocks

## PENDING / NOT STARTED
- Dynamic dashboard rendering from config (Home widgets/entities, tab content still partly hardcoded) — biggest structural gap
- Widget reordering (long-press drag-and-drop)
- Guest/admin config mode (guestConfigOpen stub exists, not built)
- General screensaver polish (clock mode exists, no design pass)
- Phase 7: real admin login (server-side auth — distinct from child-lock UX gate)
- Phase 8/9: error/offline states, Waveshare touch calibration
- Music integrations: YouTube Music via Music Assistant free-tier community provider is the viable free path (researched); Spotify/Amazon parked behind API walls
- Verify the HA invalid-auth fix fully cleared (user to confirm from HA logs)
- Full apple-design pass (motion + visual + layout) — planned as 6 committed batches

## Design skill installed
- `~/.claude/skills/apple-design/` (global) — Apple WWDC fluid-interface principles. Consult it for gesture/animation/material/typography work. Pointer-event + rAF based.

## Critical Rules (unchanged, still apply)
- config.json ONLY written after full wizard completion
- HA token NEVER in client code — proxied via /api/* server routes
- Setup wizard hardcoded black/white, not CSS variables
- Deploy ALWAYS via `bash scripts/deploy.sh --update` from Mac — never npm on Mac
- Commit to git after each confirmed batch of changes (baseline discipline — several past regressions came from large uncommitted change stacks)

---

# Home Display — Project Context

## What this is
A custom SvelteKit 5 (Svelte 5 runes) dashboard for a wall-mounted Raspberry Pi display. Integrates with Home Assistant via server-side WebSocket. Apple-inspired dark mode design. Four tabs: Home, Security, Music, Zones.

## Hardware
- Raspberry Pi 4 Model B, 4GB RAM, aarch64, Debian 13 (Trixie)
- Production display (CURRENT): Waveshare 10.1" DSI at 1280×800, run portrait (800px wide × 1280px tall), touchscreen (wlr-randr transform 270 on HDMI-A-1 under labwc/Wayland)
- The external 1440×2560 portrait monitor is RETIRED
- Pi is headless — accessed only via SSH from Mac (user: dash @ 192.168.7.21)

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
- Type scale: clock 96px, hero 36–44px, body 22–26px (token values unchanged; sizing now targets the 800px-wide Waveshare portrait panel, not the retired monitor)

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
- Phase 6: General screensaver — PARTIAL (music screensaver complete; B&W clock idle mode exists but not yet polished)
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
