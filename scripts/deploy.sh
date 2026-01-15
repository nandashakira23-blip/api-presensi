#!/bin/bash

# Auto Deploy Script
# Triggered by GitHub webhook or manual execution

echo "=========================================="
echo "Starting Auto Deploy"
echo "=========================================="
echo "Time: $(date)"
echo ""

# Navigate to project directory
cd /var/www/api-presensi || exit 1

# Stash any local changes
echo "Stashing local changes..."
git stash

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies if package.json changed
if git diff HEAD@{1} --name-only | grep -q "package.json"; then
    echo "package.json changed, installing dependencies..."
    npm install
fi

# Run migrations if migration files changed
if git diff HEAD@{1} --name-only | grep -q "migrations/"; then
    echo "Migration files changed, running migrations..."
    npm run migrate:up
fi

# Restart PM2
echo "Restarting PM2..."
pm2 restart presensi-api

# Show status
echo ""
echo "=========================================="
echo "Deploy Complete!"
echo "=========================================="
pm2 status presensi-api

# Show last 10 lines of log
echo ""
echo "Last 10 log lines:"
pm2 logs presensi-api --lines 10 --nostream
