{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww26320\viewh19960\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Home Display Project Context\
\
## What this is\
A custom web app dashboard for wall-mounted Raspberry Pi displays, integrating\
with Home Assistant. Apple-inspired design, dark mode, 4 sections (Home,\
Security, Music, Controls), per-instance device permissions, music-artwork\
screensaver. Develop with code on Mac, runtime on Pi, view from Mac browser.\
\
## Hardware\
- Raspberry Pi 4 Model B, 4GB RAM, aarch64\
- OS: Raspberry Pi OS based on Debian 13 (Trixie), kernel 6.12\
- Pi is headless; accessed only via SSH from the Mac (user: dash @ 192.168.7.21)\
- Dev display: external monitor at 1440\'d72560 in portrait orientation,\
  connected directly to Pi via HDMI (used for production-mode visual checks)\
- Target production display (deferred): Waveshare 10.1" DSI at 1280\'d7800,\
  portrait, touchscreen, with PoE HAT for power\
- USB-C power during development; PoE HAT in production\
- Node.js LTS + npm installed on the Pi (via NodeSource)\
\
## Access model\
- Pi is accessed exclusively via SSH from the Mac at 192.168.7.21\
- No keyboard or mouse is connected to the Pi during dev\
- Mouse may be connected later for touch simulation; never a keyboard\
- All Pi interaction must be scriptable from Mac SSH; no GUI-only workflows\
- During dev, the Mac browser connects to http://192.168.7.21:5173 to view\
  what the Pi serves; the Pi's connected monitor is only used for occasional\
  visual checks and for production-mode kiosk display\
\
## Tech stack\
- SvelteKit + TypeScript\
- Tailwind CSS + Apple-inspired design tokens\
- home-assistant-js-websocket for HA integration\
- HLS.js for camera streams\
- Electron for Pi packaging (deferred to Phase 9; may not be needed if\
  Chromium kiosk suffices)\
\
## Home Assistant setup\
- HAOS in a TrueNAS VM at 192.168.7.39\
- 4 Eufy 2C + 1 Eufy 2C Pro via HomeBase 2 \uc0\u8594  RTSP via Generic Camera integration\
- HomeBase 2 has native HomeKit Secure Video direct to Apple Home (not via HA)\
- Wyze Doorbell v1 attempted via IDisposable Wyze Bridge; DTLS handshake fails\
  with this doorbell firmware. Deferred.\
- No iCloud+ subscription \uc0\u8594  no HKSV recording\
- Spotify: building UI assuming Premium API access (Connect + Web Playback SDK).\
  User does not currently have Premium. Free-tier playback is not supported by\
  Spotify's APIs; the dashboard will be wired correctly so when user upgrades,\
  it works. Until then, show now-playing metadata and disable casting controls.\
- Amazon Music: build in parallel with full functionality\
- HA admin/non-admin user roles drive dashboard control permissions\
\
## Network\
- Eero Pro 6 router\
- All devices on 192.168.7.0/24\
- HomeBase 2 reserved at 192.168.7.234\
- HAOS at 192.168.7.39\
- Pi at 192.168.7.21\
- HomeBase 2 RTSP: rtsp://USER:PASS@192.168.7.234/liveN (creds in 1Password)\
\
## v1 scope (this build)\
- Master bathroom version only; per-room variants in v2\
- Hardcode room + owner for v1\
- Admin login gates device control; all instances can VIEW state\
- Music: now-playing display + casting controls (casting disabled until Premium)\
\
## Development workflow\
- All code lives on the Mac at ~/Documents/Claude/Projects/Dashboard/\
- Edits happen on the Mac (Claude Code or any editor)\
- Files synced to Pi via rsync; Pi runs the dev server, Mac views the result\
- Pi path: /home/dash/home-display/\
- Pi user: dash, accessed via SSH at 192.168.7.21\
- Sync command (run from Mac after each session):\
    rsync -avz --delete \\\
      --exclude 'node_modules' --exclude '.git' --exclude '.svelte-kit' \\\
      ~/Documents/Claude/Projects/Dashboard/ dash@192.168.7.21:/home/dash/home-display/\
- The dev server binds to 0.0.0.0:5173 so it's accessible from the Mac\
- View dashboard from Mac browser at: http://192.168.7.21:5173\
- Visual validation on Pi's monitor: switch to production mode via systemd\
- Mac does NOT run npm install, npm run build, or npm run dev. These run on the Pi. Mac is editor + git + rsync only.\
\
## Runtime modes\
- Pi runs in one of two modes, controlled by /home/dash/home-display/mode file\
- Debug mode: `npm run dev`, verbose logs, no Chromium auto-launch,\
  resolution forced to 1440\'d72560 portrait (the dev monitor)\
- Production mode: built static site served by Node, Chromium auto-launches\
  in kiosk at the actual display resolution\
- Mode is switched by writing 'debug' or 'production' to the mode file\
  and restarting the systemd service:\
    ssh dash@192.168.7.21 'echo debug > /home/dash/home-display/mode && \\\
      sudo systemctl restart home-display'\
- Two systemd services manage the Pi: home-display.service (the dashboard)\
  and home-display-kiosk.service (Chromium, only enabled in production)\
- All logs to journalctl, queryable from Mac via SSH:\
    ssh dash@192.168.7.21 'journalctl -u home-display -f'\
\
## Pi-specific runtime notes\
- Pi 4 + 1440\'d72560 is workable but tight on GPU throughput for Chromium\
- Prefer opacity/crossfade transitions over heavy motion or blur effects\
- All performance-sensitive code (camera streams, transitions) must be\
  validated on the Pi, not assumed-fine from Mac dev\
- We test at 1440\'d72560 dev resolution, but design must also work at the\
  smaller 1280\'d7800 target Waveshare resolution. Use responsive layout\
  that adapts; do not pixel-pin to either resolution.\
- Compositor is labwc (Wayland); X11/LXDE is not present on Trixie\
- Wayland socket: WAYLAND_DISPLAY=wayland-0, XDG_RUNTIME_DIR=/run/user/1000\
- Display rotation is configured in ~/.config/labwc/autostart via wlr-randr;\
  output name and transform live in DISPLAY_OUTPUT / DISPLAY_TRANSFORM at the\
  top of scripts/deploy.sh\
- Query available outputs from Mac:\
    ssh dash@192.168.7.21 'WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1000 wlr-randr'\
- Waveshare DSI display will likely need a different transform value; verify\
  with wlr-randr when the hardware arrives\
- Touch coordinate mapping (Waveshare touchscreen) is separate from display\
  transform; both must match for correct touch input\
\
## Build phases\
0. Project skeleton + HA WebSocket connection + systemd + mode switching\
1. Home section (weather, thermostat, sensors)\
2. Bottom nav + section routing\
3. Security section (camera grid, fullscreen tap, arm/disarm)\
4. Smart Home Controls (entity list, permissions filter)\
5. Music (Spotify + Amazon Music, now-playing + casting UI)\
6. Screensaver (idle \uc0\u8594  time/weather; playing \u8594  music artwork)\
7. Admin login + first-boot config\
8. Polish (animations, error states, offline)\
9. Production deployment refinements (auto-start hardening, recovery, etc.)\
\
## Conventions\
- TypeScript strict mode\
- All HA entity references and the WebSocket client live under\
  src/lib/server/ha/ (server-only; SvelteKit enforces this). Client\
  components subscribe to entity state via server-side endpoints or load\
  functions, never by importing from src/lib/server/.\
- The HA token (HA_TOKEN env var) must never appear in client-side code.\
  Entity data flows into components via a +page.ts or +layout.ts load\
  function, or through a +server.ts endpoint; never via direct import\
  from src/lib/server/.\
- Design tokens in src/lib/design/tokens.ts, never inline values\
- All npm/Node execution happens on the Pi, never on the Mac. The Mac handles editing, git, and rsync only. To validate a change, deploy and check journalctl on the Pi.\
- Each session ends with the sync command run and the Pi displaying the\
  current code, so we always know what's actually deployed\
- Commit to git (locally) after every successful session\
- Credentials (HA token, RTSP passwords, future API keys) in .env only,\
  never in source files, .env is gitignored}