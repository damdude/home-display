#!/bin/bash -e
# ─────────────────────────────────────────────────────────────────────────────
# pi-gen custom stage — runs INSIDE the image chroot at build time (natively on
# the ARM64 runner). Creates the kiosk user, clones the dashboard, then runs the
# FULL provision.sh: installs everything (Node, labwc+Chromium kiosk, autologin,
# display rotation, comitup WiFi portal) AND runs `npm install && npm run build` so the
# built app + node_modules are baked into the image. The flashed card then boots
# straight into the dashboard with NO network required (WiFi is only needed later
# to reach Home Assistant). provision.sh also marks first-boot done, so the kiosk
# starts immediately instead of waiting on the WiFi/build first-boot flow.
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

# 4. Full provision INCLUDING the build (IMAGE_BUILD=1), so the image is
#    self-contained and boots offline — but first-boot stays PENDING so the Pi
#    still runs the best-effort WiFi + updates flow on first power-on.
IMAGE_BUILD=1 TARGET_USER="${DASH_USER}" APP_DIR="${APP_DIR}" \
  DISPLAY_OUTPUT="${DISPLAY_OUTPUT:-HDMI-A-1}" \
  DISPLAY_TRANSFORM="${DISPLAY_TRANSFORM:-270}" \
  bash "${APP_DIR}/appliance/provision.sh"

echo "==> Dashboard image stage complete — first boot finalizes WiFi + build."
