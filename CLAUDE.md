{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Home Display Project Context\
\
## What this is\
A custom web app dashboard for wall-mounted Raspberry Pi displays, integrating\
with Home Assistant. Apple-inspired design, dark mode, 4 sections (Home,\
Security, Music, Controls), per-instance device permissions, music-artwork\
screensaver. Develop in browser on Mac first, deploy to Pi later.\
\
## Hardware\
- Raspberry Pi 4 Model B, 4GB RAM, aarch64\
- OS: Raspberry Pi OS based on Debian 13 (Trixie), kernel 6.12\
- Display: Waveshare 10.1" DSI (planned), portrait orientation\
- PoE HAT (planned); USB-C power during development\
- Currently developing on macOS with mouse; touchscreen later\
\
## Tech stack\
- SvelteKit + TypeScript\
- Tailwind CSS + Apple-inspired design tokens\
- home-assistant-js-websocket for HA integration\
- HLS.js for camera streams\
- Electron for Pi packaging (deferred to Phase 9)\
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
- HomeBase 2 RTSP: rtsp://USER:PASS@192.168.7.234/liveN (creds in 1Password)\
\
## v1 scope (this build)\
- Master bathroom version only; per-room variants in v2\
- Hardcode room + owner for v1\
- Admin login gates device control; all instances can VIEW state\
- Music: now-playing display + casting controls (casting disabled until Premium)\
- Dev in browser on Mac; Electron + Pi deployment in Phase 9\
\
## Build phases\
0. Project skeleton + HA WebSocket connection\
1. Home section (weather, thermostat, sensors)\
2. Bottom nav + section routing\
3. Security section (camera grid, fullscreen tap, arm/disarm)\
4. Smart Home Controls (entity list, permissions filter)\
5. Music (Spotify + Amazon Music, now-playing + casting UI)\
6. Screensaver (idle \uc0\u8594  time/weather; playing \u8594  music artwork)\
7. Admin login + first-boot config\
8. Polish (animations, error states, offline)\
9. Electron wrap + Pi deployment\
\
## Conventions\
- TypeScript strict mode\
- All HA entity references in src/lib/ha/stores.ts, never hardcoded in components\
- Design tokens in src/lib/design/tokens.ts, never inline values\
- Each session ends with `npm run build` passing}