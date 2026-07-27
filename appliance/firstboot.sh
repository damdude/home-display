#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# firstboot.sh — runs ONCE on the first boot (as root, via
# home-display-firstboot.service), AFTER labwc + the splash are up.
#
# The app is already built into the image, so this is BEST-EFFORT: it offers a
# short window to set up WiFi, and if the Pi comes online it pulls all updates
# (OS + Node + dashboard). If WiFi is never configured it does NOT error — it
# just continues into the (fully working, offline) dashboard.
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

status 5 "Starting up…" "Home Display first-time setup"

# ── 1. Best-effort WiFi window (comitup serves the AP + captive portal) ───────
# Give the user a few minutes to set WiFi from their phone. If they don't, we
# continue OFFLINE — the app is already built and works without a network.
status 10 "Set up WiFi (optional)…" "Join 'HomeDashboard-…' on your phone to add WiFi, or wait to continue offline"
online=0
for _ in $(seq 1 48); do            # ~48 × 5s = 4 min window
  if nm-online -q -t 4 2>/dev/null || ping -c1 -W2 1.1.1.1 >/dev/null 2>&1; then online=1; break; fi
  sleep 5
done

if [ "$online" = "1" ]; then
  status 25 "Connected" "Internet connection established — updating"
  export DEBIAN_FRONTEND=noninteractive

  # ── OS + Node updates (Node comes from the NodeSource apt repo) ──
  status 40 "Updating system…" "Upgrading Raspberry Pi OS + Node (a few minutes)"
  apt-get update -y       > /dev/null 2>&1 || true
  apt-get full-upgrade -y > /dev/null 2>&1 || true
  apt-get autoremove -y   > /dev/null 2>&1 || true

  # ── Dashboard update (latest code, rebuilt as the app owner) ──
  status 70 "Updating dashboard…" "Pulling the latest version and rebuilding"
  APP_USER="$(stat -c %U "$APP_DIR" 2>/dev/null || echo dash)"
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && git fetch --quiet origin main && git reset --hard origin/main && npm ci && npm run build" \
    > /dev/null 2>&1 || status 85 "Update skipped" "Couldn't update the app — using the built-in version"
  status 95 "Almost ready" "Updates applied"
else
  # No WiFi — totally fine. The baked-in build runs offline; WiFi can be added
  # later (comitup keeps offering its AP; HA setup happens once online).
  status 90 "Continuing without WiFi" "You can add WiFi anytime — starting the dashboard"
fi

# ── 2. Done — never run again; reboot into the kiosk (HA QR / dashboard) ──────
touch "$FLAG"
status 100 "Ready — starting…" "Launching the dashboard"
sleep 3
/sbin/reboot
