#!/bin/bash

# Auto Pull Script - untuk cron job
# Cek update setiap X menit dan pull jika ada perubahan

cd /var/www/api-presensi || exit 1

# Fetch latest changes
git fetch origin main

# Check if there are new commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date)] New changes detected, pulling..."
    bash /var/www/api-presensi/scripts/deploy.sh
else
    echo "[$(date)] No changes detected"
fi
