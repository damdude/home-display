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

## First-boot flow (what the appliance does on its own)

```
Power on
  └─ WiFi?  ── no ─▶ Pi opens its own hotspot "HomeDashboard-xxxx"
  │                   → join it from your phone → pick your home WiFi + password
  │  (yes: WiFi preset in Raspberry Pi Imager → skips the hotspot)
  ├─ Online ─▶ update Raspberry Pi OS (apt full-upgrade)
  ├─ Build + enable the dashboard services
  └─ Reboot ─▶ kiosk opens ─▶ HA setup QR code
```

WiFi onboarding uses [comitup](https://davesteele.github.io/comitup/): it only
raises its own access point when there is **no** working connection, so a
WiFi network preset in Raspberry Pi Imager is honored and the hotspot never
appears. That is the "support both" behavior.

---

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
| `firstboot.sh` | First-boot: wait for WiFi → OS upgrade → build → reboot into kiosk. |
| `systemd/home-display-firstboot.service` | Runs `firstboot.sh` once, before the kiosk. |
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
