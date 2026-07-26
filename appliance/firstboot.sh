#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# firstboot.sh — runs ONCE on the very first boot of a flashed image, before the
# kiosk. Waits for the user to get the Pi online (via preset WiFi or the comitup
# captive portal), upgrades the OS, then reboots into the kiosk → HA QR setup.
#
# Sequenced by home-display-firstboot.service (Before= the kiosk). Guarded by a
# flag so it never runs again. Progress is printed to the HDMI console (tty1).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

FLAG=/var/lib/home-display/firstboot.done
[ -f "$FLAG" ] && exit 0
mkdir -p /var/lib/home-display

TTY=/dev/tty1
say() { echo "" > "$TTY" 2>/dev/null || true; echo "  $*" > "$TTY" 2>/dev/null || true; echo "==> $*"; }

say "Home Display — first-time setup"
say "If no WiFi is configured, connect your phone to the WiFi network"
say "named 'HomeDashboard-...' and choose your home network."
say "Waiting for an internet connection…"

# ── 1. Wait for connectivity (up to ~1h; comitup serves the AP meanwhile) ─────
online=0
for _ in $(seq 1 720); do   # 720 × 5s = 60 min
  if nm-online -q -t 4 2>/dev/null || ping -c1 -W2 1.1.1.1 >/dev/null 2>&1; then
    online=1; break
  fi
  sleep 5
done

APP_DIR="${APP_DIR:-/home/dash/home-display}"

if [ "$online" = "1" ]; then
  say "Online. Updating the operating system — please wait, do not power off…"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y            > /dev/null 2>&1 || true
  apt-get full-upgrade -y      > /dev/null 2>&1 || true
  apt-get autoremove -y        > /dev/null 2>&1 || true
  say "OS updated. Building the dashboard — this takes a few minutes…"
  # Full provisioning on a live system (npm build, services, kiosk). Idempotent;
  # packages baked into the image make this fast. Needs network (npm/apt).
  bash "${APP_DIR}/appliance/provision.sh" > /dev/null 2>&1 || say "Provisioning hit an error — see: journalctl -u home-display-firstboot"
  say "Dashboard ready."
else
  say "No connection after waiting — will retry on next boot."
  # Don't mark done: without network we can't build. Reboot to try again.
  sleep 5
  /sbin/reboot
  exit 0
fi

# ── 3. Mark done + reboot into the kiosk ──────────────────────────────────────
touch "$FLAG"
say "Setup done. Restarting into the dashboard…"
sleep 3
/sbin/reboot
