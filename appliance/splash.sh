#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# splash.sh — first-boot splash (runs as the kiosk user via
# home-display-splash.service). Waits for the Wayland compositor + the local
# status server (started by firstboot.sh as root), then opens Chromium kiosk on
# the splash page. firstboot.sh updates status.json; the page polls it live.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

PORT="${SPLASH_PORT:-8099}"
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"

# Wait for labwc's Wayland socket.
for _ in $(seq 1 30); do [ -S "${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY}" ] && break; sleep 1; done
# Wait for the splash status server (firstboot.sh brings it up).
for _ in $(seq 1 40); do curl -sf "http://localhost:${PORT}/status.json" >/dev/null 2>&1 && break; sleep 1; done

CHROME="$(command -v chromium || command -v chromium-browser || echo /usr/bin/chromium)"
exec "${CHROME}" \
  --kiosk --ozone-platform=wayland --noerrdialogs --disable-infobars \
  --no-first-run --disable-session-crashed-bubble --disable-restore-session-state \
  --disable-pinch --check-for-update-interval=31536000 --disable-background-networking \
  --password-store=basic "http://localhost:${PORT}/"
