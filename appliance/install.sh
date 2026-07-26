#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# install.sh — one-line installer for an EXISTING Raspberry Pi OS (Bookworm+,
# 64-bit, with the Wayland desktop). Turns it into the Home Display appliance.
#
#   curl -sSL https://raw.githubusercontent.com/damdude/home-display/main/appliance/install.sh | sudo bash
#
# Overridable: REPO, BRANCH, TARGET_USER, APP_DIR, DISPLAY_OUTPUT, DISPLAY_TRANSFORM
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo:  curl -sSL <url> | sudo bash" >&2; exit 1; }

REPO="${REPO:-https://github.com/damdude/home-display.git}"
BRANCH="${BRANCH:-main}"

# Resolve target (non-root) user.
if [ -z "${TARGET_USER:-}" ]; then
  if id dash >/dev/null 2>&1; then TARGET_USER=dash
  elif [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != root ]; then TARGET_USER="${SUDO_USER}"
  else TARGET_USER="$(getent passwd 1000 | cut -d: -f1)"; fi
fi
id "${TARGET_USER}" >/dev/null 2>&1 || { echo "User '${TARGET_USER}' not found" >&2; exit 1; }
USER_HOME="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"
APP_DIR="${APP_DIR:-${USER_HOME}/home-display}"

echo "==> Installing Home Display for '${TARGET_USER}' at ${APP_DIR}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git

# Clone or update the repo as the target user.
if [ -d "${APP_DIR}/.git" ]; then
  echo "==> Updating existing checkout…"
  sudo -u "${TARGET_USER}" git -C "${APP_DIR}" fetch --depth 1 origin "${BRANCH}"
  sudo -u "${TARGET_USER}" git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"
else
  echo "==> Cloning ${REPO} (${BRANCH})…"
  sudo -u "${TARGET_USER}" git clone --depth 1 -b "${BRANCH}" "${REPO}" "${APP_DIR}"
fi

# Hand off to the provisioner (installs deps, builds, services, kiosk, WiFi).
TARGET_USER="${TARGET_USER}" APP_DIR="${APP_DIR}" \
  DISPLAY_OUTPUT="${DISPLAY_OUTPUT:-HDMI-A-1}" \
  DISPLAY_TRANSFORM="${DISPLAY_TRANSFORM:-270}" \
  bash "${APP_DIR}/appliance/provision.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Home Display installed. Reboot to launch:"
echo "     sudo reboot"
echo " On boot the kiosk opens the HA setup QR screen."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
