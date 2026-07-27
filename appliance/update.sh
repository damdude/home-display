#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# update.sh — self-update the dashboard: pull the latest code, reinstall deps,
# rebuild, and restart the service. Invoked by home-display-update.service (a
# SEPARATE unit), so the `systemctl restart home-display` at the end does not
# kill this script (it runs outside the dashboard's cgroup).
#
# Anonymous fetch works because home-display is a public repo — no token needed.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# appliance/ -> repo root
cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "[update] fetching latest…"
git fetch --quiet origin
branch="$(git rev-parse --abbrev-ref HEAD)"; [ "$branch" = HEAD ] && branch=main
git reset --hard "origin/${branch}"

echo "[update] installing dependencies…"
npm install --no-audit --no-fund

echo "[update] building…"
npm run build

echo "[update] restarting dashboard…"
sudo systemctl restart home-display

echo "[update] done."
