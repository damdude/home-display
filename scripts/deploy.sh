#!/usr/bin/env bash
# Run from Mac to provision or re-provision the Pi.
# Usage:
#   bash scripts/deploy.sh          — full first-time provision
#   bash scripts/deploy.sh --update — code-only update (rsync + npm install + restart)
#
# .env model
# ──────────
# Single source of truth on Mac at <repo-root>/.env.
# Rsync transfers it to the Pi on every deploy.
# Never edit .env on the Pi directly — your changes will be
# overwritten on the next deploy.
set -euo pipefail

PI="dash@192.168.7.21"
REMOTE_DIR="/home/dash/home-display"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPDATE_ONLY="${1:-}"

# ─── Display config (change when switching displays) ─────────────────────────
DISPLAY_OUTPUT="HDMI-A-1"   # wlr-randr --query to list outputs
DISPLAY_TRANSFORM="270"     # normal | 90 | 180 | 270 | flipped | flipped-90 | flipped-180 | flipped-270

log()  { echo ""; echo "==> $*"; }
ok()   { echo "    ✓  $*"; }
warn() { echo "    ⚠  $*"; }

# ─── Pre-flight: .env must exist on Mac ───────────────────────────────────────
if [ ! -f "$LOCAL_DIR/.env" ]; then
  echo ""
  echo "  ERROR: $LOCAL_DIR/.env not found."
  echo "  Create it before deploying:"
  echo "    cp $LOCAL_DIR/.env.example $LOCAL_DIR/.env"
  echo "  Then fill in HA_URL and HA_TOKEN."
  exit 1
fi

# ─── Pre-flight: passwordless sudo on Pi ──────────────────────────────────────
# deploy.sh runs all SSH commands non-interactively (no TTY). sudo requires a
# TTY to prompt for a password, so every sudo call would fail unless dash has
# passwordless sudo configured. Check now and fail fast with the one-time fix.
if ! ssh "$PI" "sudo -n true" 2>/dev/null; then
  echo ""
  echo "  ERROR: dash does not have passwordless sudo on the Pi."
  echo "  Run this once from your Mac (you will be prompted for the dash password):"
  echo ""
  echo "    ssh -t $PI 'echo \"dash ALL=(ALL) NOPASSWD:ALL\" | sudo tee /etc/sudoers.d/dash-nopasswd && sudo chmod 440 /etc/sudoers.d/dash-nopasswd'"
  echo ""
  echo "  Then re-run: bash scripts/deploy.sh"
  exit 1
fi
ok "Passwordless sudo confirmed"

# ─── 1. Rsync (.env is included — Mac is the single source of truth) ──────────
log "Syncing files to Pi..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.svelte-kit' \
  --exclude 'mode' \
  "$LOCAL_DIR/" "$PI:$REMOTE_DIR/"

# Verify .env landed on the Pi
if ! ssh "$PI" "test -f $REMOTE_DIR/.env"; then
  echo ""
  echo "  ERROR: rsync completed but $REMOTE_DIR/.env is missing on the Pi."
  echo "  Check that the local .env is readable and re-run."
  exit 1
fi
ok "Files synced (.env transferred)"

# Ensure mode file exists on Pi (default: debug); never overwritten by rsync
ssh "$PI" "[ -f $REMOTE_DIR/mode ] || echo debug > $REMOTE_DIR/mode"

if [ "$UPDATE_ONLY" = "--update" ]; then
  log "Update mode: skipping provisioning steps"
  log "Installing npm dependencies..."
  ssh "$PI" "cd $REMOTE_DIR && npm install"
  ok "Done"
  log "Restarting services..."
  ssh "$PI" "sudo systemctl restart home-display home-display-kiosk" || true
  echo ""
  echo "  Tail logs: ssh $PI 'journalctl -u home-display -f'"
  exit 0
fi

# ─── 2. Node.js ───────────────────────────────────────────────────────────────
log "Checking Node.js..."
ssh "$PI" 'bash -s' << 'ENDSSH'
if command -v node >/dev/null 2>&1; then
  echo "    ✓  Node.js $(node --version) already installed"
else
  echo "    Installing Node.js LTS via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "    ✓  Node.js $(node --version) installed"
fi
ENDSSH

# ─── 3. npm install ───────────────────────────────────────────────────────────
log "Installing npm dependencies..."
ssh "$PI" "cd $REMOTE_DIR && npm install"
ok "Dependencies installed"

# ─── 4. Systemd service units ─────────────────────────────────────────────────
log "Installing systemd service units..."
ssh "$PI" "
  sudo cp $REMOTE_DIR/systemd/home-display.service        /etc/systemd/system/home-display.service
  sudo cp $REMOTE_DIR/systemd/home-display-kiosk.service  /etc/systemd/system/home-display-kiosk.service
  sudo chmod 644 /etc/systemd/system/home-display.service
  sudo chmod 644 /etc/systemd/system/home-display-kiosk.service
"
ok "Service units installed"

# ─── 5. Sudoers fragment ──────────────────────────────────────────────────────
log "Installing sudoers fragment..."
ssh "$PI" "
  sudo cp $REMOTE_DIR/sudoers/home-display /etc/sudoers.d/home-display
  sudo chmod 440 /etc/sudoers.d/home-display
  sudo visudo -c -f /etc/sudoers.d/home-display
"
ok "Sudoers installed and validated"

# ─── 6. Lightdm auto-login ────────────────────────────────────────────────────
log "Verifying lightdm auto-login for user 'dash'..."
ssh "$PI" 'bash -s' << 'ENDSSH'
CONF=/etc/lightdm/lightdm.conf
REBOOT_NEEDED=0

if grep -rq "autologin-user=dash" /etc/lightdm/ 2>/dev/null; then
  echo "    ✓  Auto-login already configured for dash"
else
  echo "    Configuring lightdm auto-login..."
  if grep -q "^\[Seat:\*\]" "$CONF" 2>/dev/null; then
    sudo sed -i '/^\[Seat:\*\]/a autologin-user-timeout=0\nautologin-user=dash' "$CONF"
  else
    printf '\n[Seat:*]\nautologin-user=dash\nautologin-user-timeout=0\n' \
      | sudo tee -a "$CONF" > /dev/null
  fi
  echo "    ✓  Auto-login configured"
  REBOOT_NEEDED=1
fi

# Ensure greeter timeout is 0 (prevents lock screen while kiosk is running)
if ! grep -q "autologin-user-timeout=0" "$CONF" 2>/dev/null; then
  sudo sed -i 's/autologin-user-timeout=.*/autologin-user-timeout=0/' "$CONF" 2>/dev/null || true
fi

if [ "$REBOOT_NEEDED" = "1" ]; then
  echo "    ⚠  A reboot is required for auto-login to take effect."
fi
ENDSSH

# ─── 7. Screen blanking & DPMS ────────────────────────────────────────────────
log "Disabling screen blanking and DPMS..."
ssh "$PI" 'bash -s' << 'ENDSSH'
AUTOSTART_DIR="/home/dash/.config/lxsession/LXDE-pi"
AUTOSTART="$AUTOSTART_DIR/autostart"
mkdir -p "$AUTOSTART_DIR"
if grep -q "xset s off" "$AUTOSTART" 2>/dev/null; then
  echo "    ✓  Screen blanking already disabled"
else
  cat >> "$AUTOSTART" << 'EOF'
@xset s off
@xset -dpms
@xset s noblank
EOF
  echo "    ✓  Screen blanking disabled (takes effect on next login)"
fi

# X11 server-level blanking — prevents blanking before LXDE session starts
if [ ! -f /etc/X11/xorg.conf.d/10-noblank.conf ]; then
  sudo mkdir -p /etc/X11/xorg.conf.d
  sudo tee /etc/X11/xorg.conf.d/10-noblank.conf > /dev/null << 'EOF'
Section "ServerFlags"
  Option "BlankTime"   "0"
  Option "StandbyTime" "0"
  Option "SuspendTime" "0"
  Option "OffTime"     "0"
EndSection
EOF
  echo "    ✓  X11 server-level blanking disabled"
fi
ENDSSH

# ─── 8. labwc autostart: display rotation ────────────────────────────────────
log "Configuring labwc autostart for display rotation..."
ssh "$PI" "bash -s" << ENDSSH_ROTATION
AUTOSTART_DIR="\$HOME/.config/labwc"
AUTOSTART="\$AUTOSTART_DIR/autostart"
mkdir -p "\$AUTOSTART_DIR"
ROTATE_CMD="wlr-randr --output $DISPLAY_OUTPUT --transform $DISPLAY_TRANSFORM"
if grep -qF "\$ROTATE_CMD" "\$AUTOSTART" 2>/dev/null; then
  echo "    ✓  Display rotation already configured (\$ROTATE_CMD)"
else
  TMP=\$(mktemp)
  echo "\$ROTATE_CMD" > "\$TMP"
  [ -f "\$AUTOSTART" ] && cat "\$AUTOSTART" >> "\$TMP"
  mv "\$TMP" "\$AUTOSTART"
  echo "    ✓  Display rotation configured (\$ROTATE_CMD)"
fi
ENDSSH_ROTATION
ok "labwc autostart updated"

# ─── 9. Reload systemd and enable services ────────────────────────────────────
log "Reloading systemd daemon and enabling services..."
ssh "$PI" "
  sudo systemctl daemon-reload
  sudo systemctl enable home-display.service
  sudo systemctl enable home-display-kiosk.service
"
ok "Services enabled (will auto-start on next boot)"

# ─── 10. Start services ───────────────────────────────────────────────────────
log "Starting home-display (dev server)..."
ssh "$PI" "sudo systemctl restart home-display.service"
ok "home-display started"

log "Starting home-display-kiosk (Chromium will open on Pi's monitor)..."
log "  This waits up to 30s for XAUTHORITY then 60s for the server — please wait..."
ssh "$PI" "sudo systemctl restart home-display-kiosk.service" && ok "home-display-kiosk started" || {
  warn "Kiosk service did not start cleanly on first attempt."
  warn "This can happen when X session auth hasn't settled yet."
  warn "Try: ssh $PI 'sudo systemctl restart home-display-kiosk'"
  warn "Logs: ssh $PI 'journalctl -u home-display-kiosk -n 50'"
}

# ─── 11. Final status ─────────────────────────────────────────────────────────
log "Final service status:"
echo ""
ssh "$PI" "sudo systemctl status home-display.service --no-pager -l" || true
echo ""
ssh "$PI" "sudo systemctl status home-display-kiosk.service --no-pager -l" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Phase 0 deploy complete."
echo ""
echo " Dashboard should be visible on the Pi's monitor."
echo " Mode:      $(ssh "$PI" "cat $REMOTE_DIR/mode 2>/dev/null || echo debug")"
echo ""
echo " Useful commands:"
echo "   Tail server logs:  ssh $PI 'journalctl -u home-display -f'"
echo "   Tail kiosk logs:   ssh $PI 'journalctl -u home-display-kiosk -f'"
echo "   Switch to prod:    ssh $PI 'echo production > $REMOTE_DIR/mode && sudo systemctl restart home-display home-display-kiosk'"
echo "   Switch to debug:   ssh $PI 'echo debug    > $REMOTE_DIR/mode && sudo systemctl restart home-display home-display-kiosk'"
echo "   Routine update:    bash scripts/deploy.sh --update"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
