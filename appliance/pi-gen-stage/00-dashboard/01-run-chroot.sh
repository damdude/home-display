#!/bin/bash -e
# ─────────────────────────────────────────────────────────────────────────────
# pi-gen custom stage — runs INSIDE the image chroot (qemu-arm) at build time.
# Bakes the appliance prerequisites into the image; the heavy build (npm) is
# deferred to firstboot.service so it runs on a live, networked system.
#
# Appended to pi-gen's stage list after stage2 (Lite). See build-image.yml.
# ─────────────────────────────────────────────────────────────────────────────

DASH_USER=dash
DASH_HOME=/home/dash
APP_DIR="${DASH_HOME}/home-display"
REPO="${DASHBOARD_REPO:-https://github.com/damdude/home-display.git}"
BRANCH="${DASHBOARD_BRANCH:-main}"

# 1. Kiosk user (uid 1000) — matches the systemd units' XDG_RUNTIME_DIR.
if ! id "${DASH_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" --uid 1000 "${DASH_USER}" \
    || adduser --disabled-password --gecos "" "${DASH_USER}"
fi
echo "${DASH_USER}:homedisplay" | chpasswd     # default password — change after first login
adduser "${DASH_USER}" sudo || true

# 2. Node.js LTS (via NodeSource).
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# 3. Clone the dashboard (build happens on first boot).
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone --depth 1 -b "${BRANCH}" "${REPO}" "${APP_DIR}"
fi
chown -R "${DASH_USER}:${DASH_USER}" "${DASH_HOME}"

# 4. WiFi captive portal (comitup) must exist AT first boot, before firstboot
#    builds anything — so install/configure it now, in the image.
bash "${APP_DIR}/appliance/wifi-portal.sh" || true

# 5. First-boot service: WiFi onboarding + OS upgrade + full provision.
install -m644 "${APP_DIR}/appliance/systemd/home-display-firstboot.service" \
  /etc/systemd/system/home-display-firstboot.service
systemctl enable home-display-firstboot.service \
  || ln -sf /etc/systemd/system/home-display-firstboot.service \
      /etc/systemd/system/multi-user.target.wants/home-display-firstboot.service

# 6. Console autologin so labwc + the kiosk start after firstboot reboots.
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<GETTY
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${DASH_USER} --noclear %I \$TERM
GETTY

echo "==> Dashboard image stage complete — first boot finalizes WiFi + build."
