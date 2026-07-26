#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# firstboot.sh — runs ONCE on the first boot (as root, via
# home-display-firstboot.service), AFTER labwc + the splash are up. Drives the
# whole onboarding while the splash shows live status:
#   WiFi wait → OS upgrade → build/provision → reboot into the dashboard.
#
# It serves the splash's status.json (a tiny python http server) and updates it
# at each phase. Guarded by a done-flag so it never runs again.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

FLAG=/var/lib/home-display/firstboot.done
[ -f "$FLAG" ] && exit 0
mkdir -p /var/lib/home-display

APP_DIR="${APP_DIR:-/home/dash/home-display}"
SPLASH_DIR=/run/home-display-splash
PORT="${SPLASH_PORT:-8099}"

# ── Splash status server (root serves; the dash-owned Chromium displays it) ────
mkdir -p "$SPLASH_DIR"; chmod 0777 "$SPLASH_DIR"
cp "$APP_DIR/appliance/splash/index.html" "$SPLASH_DIR/index.html" 2>/dev/null || true
SERVER_PID=""
if command -v python3 >/dev/null 2>&1; then
  ( cd "$SPLASH_DIR" && exec python3 -m http.server "$PORT" ) >/dev/null 2>&1 &
  SERVER_PID=$!
fi

LOG_LINES=()
# status <pct|-1> <phase> [logline]
status() {
  local pct="$1"; shift; local phase="$1"; shift; local line="${1:-}"
  [ -n "$line" ] && LOG_LINES+=("$line")
  # Keep the last 8 lines. Guard the count first: ${arr[@]: -8} on an array with
  # fewer than 8 elements returns EMPTY in bash, which would wipe the log.
  if [ "${#LOG_LINES[@]}" -gt 8 ]; then
    LOG_LINES=("${LOG_LINES[@]:${#LOG_LINES[@]}-8}")
  fi
  local logjson="" first=1 l
  for l in "${LOG_LINES[@]}"; do
    l=${l//\\/\\\\}; l=${l//\"/\\\"}
    [ $first -eq 1 ] && first=0 || logjson+=","
    logjson+="\"$l\""
  done
  local pj=${phase//\"/\\\"}
  printf '{ "phase": "%s", "pct": %s, "log": [%s] }\n' "$pj" "$pct" "$logjson" > "$SPLASH_DIR/status.json"
  echo "==> [$pct] $phase ${line}"
}

cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

status -1 "Starting up…" "Home Display first-time setup"

# ── 1. Wait for connectivity (comitup serves the AP + captive portal meanwhile) ─
status -1 "Waiting for WiFi…" "If asked, join 'HomeDashboard-…' on your phone and pick your network"
online=0
for _ in $(seq 1 720); do   # up to ~60 min
  if nm-online -q -t 4 2>/dev/null || ping -c1 -W2 1.1.1.1 >/dev/null 2>&1; then online=1; break; fi
  sleep 5
done
if [ "$online" != "1" ]; then
  status -1 "No connection — retrying…" "Rebooting to try WiFi again"
  sleep 6; /sbin/reboot; exit 0
fi
status 20 "Connected" "Internet connection established"

# ── 2. OS update/upgrade ──────────────────────────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
status 30 "Updating system…" "Fetching package lists"
apt-get update -y            > /dev/null 2>&1 || true
status 45 "Updating system…" "Upgrading Raspberry Pi OS (this can take several minutes)"
apt-get full-upgrade -y      > /dev/null 2>&1 || true
apt-get autoremove -y        > /dev/null 2>&1 || true
status 70 "System updated" "OS packages are up to date"

# ── 3. Build + finalize the dashboard (idempotent full provision) ─────────────
status 78 "Installing dashboard…" "Building the app and services"
if bash "$APP_DIR/appliance/provision.sh" > /dev/null 2>&1; then
  status 95 "Almost ready" "Dashboard built"
else
  status 95 "Finishing (with warnings)" "See: journalctl -u home-display-firstboot"
fi

# ── 4. Done — reboot into the kiosk (HA QR setup) ─────────────────────────────
touch "$FLAG"
status 100 "Ready — restarting…" "Launching the dashboard"
sleep 3
/sbin/reboot
