# Home Display — appliance install

Turn a Raspberry Pi 4 into a wall-mounted Home Assistant dashboard that boots
straight into a QR-code setup screen — no keyboard, no terminal. Two ways to
install:

1. **Flash a prebuilt image** (closest to "download & flash").
2. **One-line installer** on an existing Raspberry Pi OS.

Both end the same way: on boot the Pi shows an HA setup **QR code**; you scan it
with your phone, enter your Home Assistant URL + long-lived token, and the
dashboard configures itself.

---

## Offline-first + updates

The image is **fully built at CI time** — Node, the kiosk stack, the dashboard's
`node_modules`, and the compiled build are all baked in. So a flashed card **boots
straight into the dashboard with no network** (WiFi is only needed to reach Home
Assistant). WiFi onboarding is still available on demand via the comitup portal.

To update later, use **Settings → Check for updates**: it compares the installed
version against `origin` on GitHub, shows the **release notes** (the commit
subjects that would be applied) for you to confirm, then pulls, rebuilds, and
restarts. If already current, it says so. No periodic/background checking.

## First-boot flow (what the appliance does on its own)

```
Power on  (dashboard is already built into the image — works offline)
  └─ ~4-min WiFi window: Pi opens hotspot "HomeDashboard-xxxx"
  │      → join from your phone → pick your home WiFi   (or just wait)
  ├─ Online?
  │     yes ─▶ update Raspberry Pi OS + Node (apt) + pull & rebuild the dashboard
  │     no  ─▶ skip updates, no error — continue with the built-in version
  └─ Reboot ─▶ kiosk opens ─▶ HA setup QR code
```

Throughout these background phases the screen shows a **full-screen setup splash**
(`appliance/splash/`) with a live status window at the bottom — current phase, a
progress bar, and a short activity log — so it never looks frozen. When
onboarding finishes it reboots straight into the dashboard's HA QR screen.

WiFi onboarding uses [comitup](https://davesteele.github.io/comitup/): it only
raises its own access point when there is **no** working connection, so a
WiFi network preset in Raspberry Pi Imager is honored and the hotspot never
appears. That is the "support both" behavior.

---

## Choosing the right image (hardware)

The build produces two images — pick the one for your board:

| Your Pi | Image | Experience |
|---|---|---|
| **Pi 5, Pi 4, Pi 400, CM4** | `home-display-arm64.img.xz` | ✅ Recommended — the target hardware. |
| Pi 3 B/B+, Pi Zero 2 W | `home-display-arm64.img.xz` | ⚠️ Runs, but **below the Pi 4 bar** — noticeably laggier animations/scrolling. |
| Pi 2, Pi 1, Pi Zero (v1) | `home-display-armhf.img.xz` | ⛔ **Not recommended.** 32-bit only; the Chromium/Wayland kiosk is too heavy for a good experience. |

> **Performance warning:** the dashboard is developed and tested on a **Raspberry Pi 4**. It leans on a Chromium + Wayland kiosk, which is the heavy part. On anything **below a Pi 4** expect reduced smoothness (lower framerate, slower panel/transition animations); on pre-64-bit boards it may be unusable. For a wall dashboard, a **Pi 4 (2 GB+) or Pi 5** is strongly recommended.

Most people want **`arm64`**. The `armhf` image exists only for older 32-bit-only boards.

## Option 1 — Flash the prebuilt image

1. Download the latest `home-display-*.img.xz` from the repo's
   [**Releases**](https://github.com/damdude/home-display/releases).
2. Flash it with [Raspberry Pi Imager](https://www.raspberrypi.com/software/) or
   balenaEtcher.
   - *(Optional)* In Raspberry Pi Imager's ⚙️ settings you can preset your WiFi
     and locale — then the Pi skips the hotspot step entirely.
3. Put the SD card in the Pi and power on. Follow the on-screen prompts (join
   `HomeDashboard-xxxx` from your phone if asked), wait for the update, then scan
   the QR code.

Default login (for SSH/maintenance): user `dash`, password `homedisplay` —
**change it** after first boot (`passwd`).

The image is built by GitHub Actions (`.github/workflows/build-image.yml`) with
[pi-gen](https://github.com/RPi-Distro/pi-gen) and published to Releases.

## Option 2 — One-line installer

On a fresh **Raspberry Pi OS (64-bit, Bookworm or newer, with the Wayland
desktop)** that is already online:

```bash
curl -sSL https://raw.githubusercontent.com/damdude/home-display/main/appliance/install.sh | sudo bash
sudo reboot
```

It clones the repo, installs Node + the Wayland kiosk stack, builds the
dashboard, and sets everything to launch on boot.

---

## Customizing for your display

The default targets a **Waveshare 10.1" DSI panel in portrait** (`HDMI-A-1`,
`transform 270`). For a different screen/orientation, set these before running
the installer (or edit `~/.config/labwc/autostart` after):

```bash
export DISPLAY_OUTPUT=HDMI-A-1      # run `wlr-randr` to list outputs
export DISPLAY_TRANSFORM=270        # normal | 90 | 180 | 270 | flipped-*
curl -sSL .../install.sh | sudo -E bash
```

Other overrides: `TARGET_USER`, `APP_DIR`, `RUN_MODE` (`production`|`debug`),
`REPO`, `BRANCH`.

---

## Files

| File | Role |
|---|---|
| `install.sh` | One-line installer: clone repo → `provision.sh`. |
| `provision.sh` | Idempotent OS + app setup: Node, kiosk, services, autologin, rotation, WiFi portal. |
| `wifi-portal.sh` | Installs + configures comitup (captive-portal WiFi). |
| `update.sh` + `systemd/home-display-update.service` | Self-update (Settings → Update): pull latest → `npm ci` → build → restart. Separate unit so restarting the app doesn't kill the updater. |
| `firstboot.sh` | First boot (best-effort): offer a ~4-min WiFi window → if online, update OS + Node + dashboard → reboot into the app. If WiFi isn't set, continues offline (no error). |
| `splash/index.html` | Full-screen setup splash with a live status window (polls `status.json`). |
| `splash.sh` + `systemd/home-display-splash.service` | Chromium kiosk showing the splash during first boot. |
| `systemd/home-display-firstboot.service` | Runs `firstboot.sh` once, after the splash is up. |
| `pi-gen-stage/` | pi-gen custom stage that bakes the appliance into an image. |
| `../.github/workflows/build-image.yml` | CI: build the image, attach to the Release. |

---

## Status / testing

The dashboard app is production-tested on the Pi. **The imaging + first-boot
provisioning path needs a hardware validation pass** — it is built to mirror the
proven `scripts/deploy.sh` steps but has not yet been booted from a freshly
flashed card. Known things to verify on first real run:

- comitup captive portal appears when no WiFi is set, and is skipped when WiFi is preset.
- `firstboot.service` sequences correctly (WiFi → apt upgrade → build → reboot) and the kiosk starts only after it completes.
- labwc + Chromium `--ozone-platform=wayland` come up under console autologin on a Lite base (may need `greetd`/`seatd` tweaks vs. the full desktop).
- The pi-gen-action input names in the workflow match the action version in use.
