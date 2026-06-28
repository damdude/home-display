#!/bin/bash
# Run once on the Pi as a user with sudo access:
#   bash scripts/setup-sudoers.sh
#
# Allows the 'dash' service user to reboot and restart
# the dashboard service without a password prompt.

set -e

SUDOERS_FILE="/etc/sudoers.d/home-display"

echo "dash ALL=(ALL) NOPASSWD: /bin/systemctl reboot" | sudo tee "$SUDOERS_FILE"
echo "dash ALL=(ALL) NOPASSWD: /bin/systemctl restart home-display" | sudo tee -a "$SUDOERS_FILE"

sudo chmod 440 "$SUDOERS_FILE"
sudo visudo -c -f "$SUDOERS_FILE"

echo "✅ Sudoers entry written to $SUDOERS_FILE"
echo "   Passwordless reboot and restart are now enabled for user 'dash'"
