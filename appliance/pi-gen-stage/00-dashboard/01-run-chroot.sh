#!/bin/bash -e
# ─────────────────────────────────────────────────────────────────────────────
# pi-gen custom stage — runs INSIDE the image chroot (qemu-arm) at build time.
# Creates the kiosk user, clones the dashboard, then runs provision.sh with
# SKIP_BUILD=1: it installs everything (Node, labwc+Chromium kiosk, autologin,
# display rotation, comitup WiFi portal, splash + first-boot services) but DEFERS
# the npm build to first boot — so the build runs on a live, networked system.
# ─────────────────────────────────────────────────────────────────────────────

DASH_USER=dash
DASH_HOME=/home/dash
APP_DIR="${DASH_HOME}/home-display"
REPO="${DASHBOARD_REPO:-https://github.com/damdude/home-display.git}"
BRANCH="${DASHBOARD_BRANCH:-main}"

# 1. Kiosk user (uid 1000 — matches the systemd units' XDG_RUNTIME_DIR).
if ! id "${DASH_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" --uid 1000 "${DASH_USER}" \
    || adduser --disabled-password --gecos "" "${DASH_USER}"
fi
echo "${DASH_USER}:homedisplay" | chpasswd     # default password — change after first login
adduser "${DASH_USER}" sudo || true

# 2. git (needed to clone; provision.sh installs the rest).
apt-get install -y git ca-certificates curl

# 3. Clone the dashboard (build is deferred to first boot).
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone --depth 1 -b "${BRANCH}" "${REPO}" "${APP_DIR}"
fi
chown -R "${DASH_USER}:${DASH_USER}" "${DASH_HOME}"

# 4. Provision everything except the build. Leaves firstboot.done UNSET so the
#    first real boot runs onboarding (WiFi → OS upgrade → build) behind the splash.
SKIP_BUILD=1 TARGET_USER="${DASH_USER}" APP_DIR="${APP_DIR}" \
  DISPLAY_OUTPUT="${DISPLAY_OUTPUT:-HDMI-A-1}" \
  DISPLAY_TRANSFORM="${DISPLAY_TRANSFORM:-270}" \
  bash "${APP_DIR}/appliance/provision.sh"

echo "==> Dashboard image stage complete — first boot finalizes WiFi + build."
