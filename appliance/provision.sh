#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# provision.sh — turn a plain Raspberry Pi OS install into the Home Display
# appliance. Runs ON the Pi (invoked by install.sh, by the first-boot service,
# or by the image build). Idempotent: safe to re-run.
#
# It installs Node + a Wayland kiosk (labwc + Chromium), builds the dashboard,
# installs the systemd services, autologin, display rotation, screen-blank
# disable, the WiFi captive portal (comitup), and the passwordless sudoers rule.
#
# Tunables (override via env):
#   TARGET_USER        desktop/kiosk user            (default: dash, else current login user)
#   APP_DIR            where the app lives            (default: /home/<user>/home-display)
#   DISPLAY_OUTPUT     wlr-randr output name          (default: HDMI-A-1)
#   DISPLAY_TRANSFORM  normal|90|180|270|flipped-*    (default: 270  — Waveshare 10.1" portrait)
#   RUN_MODE           production|debug               (default: production)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Must be root ──────────────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  echo "provision.sh must run as root (use: sudo bash appliance/provision.sh)" >&2
  exit 1
fi

# ── Resolve the target user ───────────────────────────────────────────────────
# Prefer an explicit TARGET_USER, else 'dash' if it exists, else the user who
# invoked sudo, else the first UID-1000 login user.
if [ -z "${TARGET_USER:-}" ]; then
  if id dash >/dev/null 2>&1; then
    TARGET_USER=dash
  elif [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
    TARGET_USER="${SUDO_USER}"
  else
    TARGET_USER="$(getent passwd 1000 | cut -d: -f1)"
  fi
fi
if ! id "${TARGET_USER}" >/dev/null 2>&1; then
  echo "Target user '${TARGET_USER}' does not exist. Set TARGET_USER or create it first." >&2
  exit 1
fi

USER_UID="$(id -u "${TARGET_USER}")"
USER_HOME="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"
APP_DIR="${APP_DIR:-${USER_HOME}/home-display}"
DISPLAY_OUTPUT="${DISPLAY_OUTPUT:-HDMI-A-1}"
DISPLAY_TRANSFORM="${DISPLAY_TRANSFORM:-270}"
RUN_MODE="${RUN_MODE:-production}"
SKIP_BUILD="${SKIP_BUILD:-0}"   # 1 = set everything up but defer npm build to firstboot (image build)

log()  { echo ""; echo "==> $*"; }
ok()   { echo "    ✓  $*"; }

log "Provisioning Home Display for user '${TARGET_USER}' (uid ${USER_UID}), app at ${APP_DIR}"

# ── 1. Packages ───────────────────────────────────────────────────────────────
log "Installing packages (this can take a while on first run)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
# Kiosk stack: labwc (Wayland compositor), seatd, Chromium, wlr-randr for rotation.
# NetworkManager + comitup for WiFi onboarding. curl/git/ca-certificates for tooling.
apt-get install -y --no-install-recommends \
  ca-certificates curl git jq python3 \
  labwc seatd wlr-randr \
  chromium-browser chromium || apt-get install -y chromium || true
apt-get install -y network-manager || true
ok "Base packages installed"

# Node.js LTS via NodeSource (only if missing or too old)
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]; then
  log "Installing Node.js LTS…"
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v)"

# ── 2. Build the dashboard ────────────────────────────────────────────────────
if [ ! -d "${APP_DIR}" ]; then
  echo "APP_DIR ${APP_DIR} not found — clone the repo there first (install.sh does this)." >&2
  exit 1
fi
chown -R "${TARGET_USER}:${TARGET_USER}" "${APP_DIR}"

if [ "${SKIP_BUILD}" = "1" ]; then
  log "SKIP_BUILD=1 — deferring npm build to first boot"
else
  log "Installing npm dependencies + building…"
  sudo -u "${TARGET_USER}" bash -lc "cd '${APP_DIR}' && npm ci && npm run build"
fi
echo "${RUN_MODE}" > "${APP_DIR}/mode"
chown "${TARGET_USER}:${TARGET_USER}" "${APP_DIR}/mode"
# Ensure a .env exists (empty creds — HA is configured later via the QR wizard).
[ -f "${APP_DIR}/.env" ] || sudo -u "${TARGET_USER}" bash -c "printf 'HA_URL=\nHA_TOKEN=\n' > '${APP_DIR}/.env'"
ok "Dashboard built (mode: ${RUN_MODE})"

# ── 3. systemd services (templated for this user/home) ────────────────────────
log "Installing systemd services…"
cat > /etc/systemd/system/home-display.service <<UNIT
[Unit]
Description=Home Display Dashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${TARGET_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=-${APP_DIR}/.env
ExecStart=/bin/bash -c 'mode=\$(cat ${APP_DIR}/mode 2>/dev/null || echo debug); \
  if [ "\$mode" = "production" ]; then \
    export PORT=3000 NODE_ENV=production; \
    exec /usr/bin/node ${APP_DIR}/build/index.js; \
  else \
    exec ${APP_DIR}/node_modules/.bin/vite dev --host --port 5173; \
  fi'
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=home-display

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/home-display-kiosk.service <<UNIT
[Unit]
Description=Home Display Chromium Kiosk
After=graphical.target home-display.service
Wants=graphical.target
BindsTo=home-display.service
# Only after first-boot onboarding is finished (the splash owns the screen until then).
ConditionPathExists=/var/lib/home-display/firstboot.done

[Service]
Type=simple
User=${TARGET_USER}
Environment=WAYLAND_DISPLAY=wayland-0
Environment=XDG_RUNTIME_DIR=/run/user/${USER_UID}
ExecStartPre=/bin/bash -c 'for i in \$(seq 1 30); do [ -S /run/user/${USER_UID}/wayland-0 ] && exit 0; sleep 1; done; echo "no wayland socket"; exit 1'
ExecStartPre=/bin/bash -c 'mode=\$(cat ${APP_DIR}/mode 2>/dev/null || echo debug); port=5173; [ "\$mode" = "production" ] && port=3000; for i in \$(seq 1 60); do curl -sf "http://localhost:\$port" >/dev/null 2>&1 && exit 0; sleep 1; done; echo "server timeout"; exit 1'
ExecStart=/bin/bash -c 'mode=\$(cat ${APP_DIR}/mode 2>/dev/null || echo debug); \
  if [ "\$mode" = "production" ]; then url="http://localhost:3000"; else url="http://localhost:5173"; fi; \
  CHROME=\$(command -v chromium || command -v chromium-browser || echo /usr/bin/chromium); \
  exec "\$CHROME" --kiosk --ozone-platform=wayland --noerrdialogs --disable-infobars \
    --no-first-run --disable-session-crashed-bubble --disable-restore-session-state \
    --disable-pinch --check-for-update-interval=31536000 --disable-background-networking \
    --password-store=basic "\$url"'
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=home-display-kiosk

[Install]
WantedBy=graphical.target
UNIT
ok "Service units installed"

# ── 4. Passwordless sudo for service control (used by the in-app Settings) ────
cat > /etc/sudoers.d/home-display <<SUDO
# Allow ${TARGET_USER} to manage home-display services + reboot without a password
${TARGET_USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart home-display, \
  /usr/bin/systemctl restart home-display-kiosk, \
  /usr/bin/systemctl start home-display, /usr/bin/systemctl stop home-display, \
  /usr/bin/systemctl start home-display-kiosk, /usr/bin/systemctl stop home-display-kiosk, \
  /sbin/reboot, /usr/sbin/reboot
SUDO
chmod 440 /etc/sudoers.d/home-display
visudo -cf /etc/sudoers.d/home-display >/dev/null
ok "Sudoers installed"

# ── 5. Console autologin → the user's session starts labwc (below) ────────────
log "Configuring console autologin for ${TARGET_USER}…"
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<GETTY
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${TARGET_USER} --noclear %I \$TERM
GETTY
ok "Autologin configured"

# ── 6. Start labwc (Wayland) on login, then rotate the display ────────────────
log "Configuring labwc autostart + display rotation (${DISPLAY_OUTPUT} → ${DISPLAY_TRANSFORM})…"
# Launch labwc from the shell profile on tty1 (seatless via seatd).
PROFILE="${USER_HOME}/.bash_profile"
if ! grep -q 'exec labwc' "${PROFILE}" 2>/dev/null; then
  cat >> "${PROFILE}" <<'PROF'

# Start the Wayland kiosk compositor on the primary console
if [ "$(tty)" = "/dev/tty1" ] && [ -z "$WAYLAND_DISPLAY" ]; then
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  exec dbus-run-session -- labwc
fi
PROF
  chown "${TARGET_USER}:${TARGET_USER}" "${PROFILE}"
fi

LABWC_DIR="${USER_HOME}/.config/labwc"
mkdir -p "${LABWC_DIR}"
cat > "${LABWC_DIR}/autostart" <<LABWC
# Rotate the panel, disable blanking, then let the kiosk service take over.
wlr-randr --output ${DISPLAY_OUTPUT} --transform ${DISPLAY_TRANSFORM} &
LABWC
chown -R "${TARGET_USER}:${TARGET_USER}" "${USER_HOME}/.config"
ok "labwc autostart configured"

# seatd lets labwc open the DRM/input devices without a full display manager.
systemctl enable seatd >/dev/null 2>&1 || true
usermod -aG seat,video,input,render "${TARGET_USER}" 2>/dev/null || true

# ── 7. WiFi captive portal (comitup) — honors preset WiFi, else opens an AP ────
if bash "$(dirname "$0")/wifi-portal.sh"; then
  ok "WiFi portal (comitup) configured"
fi

# ── 8. First-boot splash + onboarding services ────────────────────────────────
log "Installing first-boot splash + onboarding services…"
sed "s#/home/dash/home-display#${APP_DIR}#g" \
  "${APP_DIR}/appliance/systemd/home-display-firstboot.service" \
  > /etc/systemd/system/home-display-firstboot.service
sed "s#/home/dash/home-display#${APP_DIR}#g; s#User=dash#User=${TARGET_USER}#; s#/run/user/1000#/run/user/${USER_UID}#" \
  "${APP_DIR}/appliance/systemd/home-display-splash.service" \
  > /etc/systemd/system/home-display-splash.service
ok "Splash + firstboot units installed"

# ── 9. Enable everything ──────────────────────────────────────────────────────
log "Enabling services…"
systemctl daemon-reload || true
systemctl enable home-display.service home-display-kiosk.service >/dev/null 2>&1 || true
systemctl enable home-display-firstboot.service home-display-splash.service >/dev/null 2>&1 || true
ok "Services enabled (start on boot)"

# ── 10. First-boot flag ───────────────────────────────────────────────────────
# When we built here (installer path), onboarding is already done — mark it so
# the kiosk starts directly and the splash/firstboot never run. When SKIP_BUILD
# (image build), leave it UNSET so first boot runs onboarding + the splash.
mkdir -p /var/lib/home-display
if [ "${SKIP_BUILD}" = "1" ]; then
  rm -f /var/lib/home-display/firstboot.done
else
  touch /var/lib/home-display/firstboot.done
fi

log "Provisioning complete."
echo "    User:     ${TARGET_USER} (uid ${USER_UID})"
echo "    App:      ${APP_DIR} (mode: ${RUN_MODE})"
echo "    Display:  ${DISPLAY_OUTPUT} transform ${DISPLAY_TRANSFORM}"
echo "    Reboot to launch the kiosk → HA QR setup screen."
