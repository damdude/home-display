#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# wifi-portal.sh — install + configure comitup for headless WiFi onboarding.
#
# "Support both": comitup only raises its own access point when the Pi has NO
# working connection. If WiFi was preset in Raspberry Pi Imager (NetworkManager
# already has a connection), comitup stays out of the way and the Pi just joins.
# Otherwise, on boot it broadcasts an AP ("HomeDashboard-<nnnn>") with a captive
# portal; the user joins from a phone and picks their home network + password.
#
# comitup needs NetworkManager to own the wifi device (not dhcpcd/wpa_supplicant).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "wifi-portal.sh must run as root" >&2; exit 1; }

AP_NAME="${AP_NAME:-HomeDashboard-<nnnn>}"   # <nnnn> → last MAC digits (comitup token)

# comitup ships in Raspberry Pi OS repos; fall back to its own apt repo if absent.
if ! command -v comitup >/dev/null 2>&1; then
  echo "==> Installing comitup…"
  if ! apt-get install -y comitup 2>/dev/null; then
    echo "deb https://davesteele.github.io/comitup/repo comitup main" \
      > /etc/apt/sources.list.d/comitup.list
    curl -fsSL https://davesteele.github.io/key/davesteele.gpg.key \
      | gpg --dearmour -o /usr/share/keyrings/comitup-archive-keyring.gpg 2>/dev/null || true
    apt-get update -y
    apt-get install -y comitup
  fi
fi

# Hand the wifi device to NetworkManager (comitup requires it).
if [ -f /etc/dhcpcd.conf ] && ! grep -q '^denyinterfaces wlan0' /etc/dhcpcd.conf; then
  echo 'denyinterfaces wlan0' >> /etc/dhcpcd.conf
fi
mkdir -p /etc/NetworkManager/conf.d
cat > /etc/NetworkManager/conf.d/10-comitup.conf <<'NMCONF'
[main]
plugins=keyfile
[keyfile]
unmanaged-devices=none
NMCONF

# comitup configuration — AP name + captive portal.
cat > /etc/comitup.conf <<CONF
# Access-point name shown when no known WiFi is available.
ap_name: ${AP_NAME}
# 'single' = one combined AP+portal mode; 'router' would NAT — we only need onboarding.
ap_mode: single
# Web-based captive portal so a phone can pick the network.
enable_appliance_mode: 0
CONF

systemctl enable NetworkManager >/dev/null 2>&1 || true
systemctl enable comitup >/dev/null 2>&1 || true
# comitup-web serves the captive portal page.
systemctl enable comitup-web >/dev/null 2>&1 || true

echo "==> comitup configured (AP: ${AP_NAME}). It stays dormant if WiFi is already set."
