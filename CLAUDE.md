{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\froman\fcharset0 Times-Bold;\f2\froman\fcharset0 Times-Roman;
\f3\fnil\fcharset0 LucidaGrande;}
{\colortbl;\red255\green255\blue255;\red201\green206\blue214;\red239\green99\blue114;\red0\green0\blue0;
\red191\green94\blue241;}
{\*\expandedcolortbl;;\cssrgb\c82745\c84314\c87059;\cssrgb\c95686\c48235\c52157;\cssrgb\c0\c0\c0;
\cssrgb\c80000\c48235\c95686;}
\margl1440\margr1440\vieww34640\viewh20740\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Home Display Project Context\
\
## What this is\
A custom web app dashboard for wall-mounted Raspberry Pi displays, integrating\
with Home Assistant. Apple-inspired design, dark mode, 4 sections (Home,\
Security, Music, Controls), per-instance device permissions, music-artwork\
screensaver. Develop in browser on Mac first, deploy to Pi later.\
\
\pard\pardeftab720\partightenfactor0

\f1\b \cf2 \expnd0\expndtw0\kerning0
##\cf3  Hardware
\f2\b0 \cf0  \cf2 -\cf0  Raspberry Pi 4 Model B, 4GB RAM, aarch64 \
\cf2 -\cf0  OS: Raspberry Pi OS based on Debian 13 (Trixie), kernel 6.12 \
\cf2 -\cf0  Pi is headless; accessed only via SSH from the Mac (user: dash) \
\cf2 -\cf0  Dev display: external monitor at 1440\'d72560 in portrait orientation, connected directly to Pi via HDMI \cf2 -\
\cf0  Target production display (deferred): Waveshare 10.1" DSI at 1280\'d7800, portrait, touchscreen, with PoE HAT for power \
\cf2 -\cf0  USB-C power during development; PoE HAT in production
\f0 \kerning1\expnd0\expndtw0 \
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0
\cf0 \
## Tech stack\
- SvelteKit + TypeScript\
- Tailwind CSS + Apple-inspired design tokens\
- home-assistant-js-websocket for HA integration\
- HLS.js for camera streams\
- Electron for Pi packaging (deferred to Phase 9)\
\
## Home Assistant setup\
- HAOS in a TrueNAS VM at 192.168.7.39\
- 4 Eufy 2C + 1 Eufy 2C Pro via HomeBase 2 
\f3 \uc0\u8594 
\f0  RTSP via Generic Camera integration\
- HomeBase 2 has native HomeKit Secure Video direct to Apple Home (not via HA)\
- Wyze Doorbell v1 attempted via IDisposable Wyze Bridge; DTLS handshake fails\
  with this doorbell firmware. Deferred.\
- No iCloud+ subscription 
\f3 \uc0\u8594 
\f0  no HKSV recording\
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
- HomeBase 2 RTSP: rtsp://USER:PASS@192.168.7.234/liveN (creds in 1Password)\
\
\pard\pardeftab720\partightenfactor0

\f1\b \cf2 \expnd0\expndtw0\kerning0
##\cf3  v1 scope (this build)
\f2\b0 \cf0  \cf2 -\cf0  Master bathroom version only; per-room variants in v2 \cf2 -\cf0  Hardcode room + owner for v1 \cf2 -\cf0  Admin login gates device control; all instances can VIEW state \cf2 -\cf0  Music: now-playing display + casting controls (casting disabled until Premium) \
\

\f1\b \cf2 ##\cf3  Development workflow
\f2\b0 \cf0  \cf2 -\cf0  All code lives on the Mac at ~/Projects/home-display/ \cf2 -\cf0  Edits happen on the Mac (Claude Code or any editor) \cf2 -\cf0  Files synced to Pi via rsync; Pi runs the actual dev server and Chromium \cf2 -\cf0  The Mac does NOT run a dev server; everything is executed on the Pi \cf2 -\cf0  Pi path: /home/dash/home-display/ \cf2 -\cf0  Pi user: dash, accessed via SSH \cf2 -\cf0  Sync command (run from Mac after each session): rsync -avz --delete \\ --exclude 'node_modules' --exclude '.git' --exclude '.svelte-kit' \\ ~/Projects/home-display/ dash@\cf2 192.168.7.21\cf0 :/home/dash/home-display/ \cf2 -\cf0  After syncing, the Pi runs: cd /home/dash/home-display && npm install && npm run dev \cf2 -\cf0  Chromium on the Pi opens http://localhost:5173 in fullscreen kiosk mode \cf2 -\cf0  We test at 1440\'d72560 dev resolution, but design must also work at the smaller 1280\'d7800 target Waveshare resolution. Use responsive layout that adapts; do not pixel-pin to either resolution.
\f0 \kerning1\expnd0\expndtw0 \
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0
\cf0 \
## Build phases\
0. Project skeleton + HA WebSocket connection\
1. Home section (weather, thermostat, sensors)\
2. Bottom nav + section routing\
3. Security section (camera grid, fullscreen tap, arm/disarm)\
4. Smart Home Controls (entity list, permissions filter)\
5. Music (Spotify + Amazon Music, now-playing + casting UI)\
6. Screensaver (idle 
\f3 \uc0\u8594 
\f0  time/weather; playing 
\f3 \uc0\u8594 
\f0  music artwork)\
7. Admin login + first-boot config\
8. Polish (animations, error states, offline)\
9. Electron wrap + Pi deployment\
\
\pard\pardeftab720\partightenfactor0

\f1\b \cf2 \expnd0\expndtw0\kerning0
##\cf3  Pi-specific runtime notes
\f2\b0 \cf0  \cf2 -\cf0  Pi 4 + 1440\'d72560 is workable but tight on GPU throughput for Chromium \cf2 -\cf0  Prefer opacity/crossfade transitions over heavy motion or blur effects \cf2 -\cf0  All performance-sensitive code (camera streams, transitions) must be validated on the Pi, not assumed-fine from Mac dev \cf2 -\cf0  Node.js: install LTS for aarch64 on the Pi (we'll script this in Phase 0)
\f0 \kerning1\expnd0\expndtw0 \
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0
\cf0 \
\
\pard\pardeftab720\partightenfactor0

\f1\b \cf2 \expnd0\expndtw0\kerning0
##\cf3  Conventions
\f2\b0 \cf0  \cf2 -\cf0  TypeScript strict mode \cf2 -\cf0  All HA entity references in src/lib/ha/stores.ts, never hardcoded in components \cf2 -\cf0  Design tokens in src/lib/design/tokens.ts, never inline values \cf2 -\cf0  Each session ends with \cf5 `npm run build`\cf0  passing on the Pi (not just the Mac) \cf2 -\cf0  Each session ends with the sync command run and the Pi displaying the current code, so we always know what's actually deployed \cf2 -\cf0  Commit to git (locally) after every successful session}