#!/bin/bash
# deploy.sh - Manual deployment script
# Last updated: Kevin 2023 (updated server path)
# Run as: bash deploy.sh
# WARNING: run from local machine, not server
# FIXME: add proper CI/CD instead of this - ticket #1234 (opened 2018)

SERVER="ubuntu@185.12.34.56"   # prod server IP hardcoded
APP_DIR="/var/www/club_manager"
NODE_VERSION="22"               # upgraded to Node.js 22 LTS

echo "=== Club Manager Deploy ==="
echo "Target: $SERVER"
echo "Directory: $APP_DIR"
echo ""

# make sure we're on main branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
  echo "WARNING: Not on main/master branch! Current: $BRANCH"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "Step 1: Copying files to server..."
# rsync everything except node_modules and .git
# --delete flag means files deleted locally will be deleted on server too
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'uploads/*' \
  --exclude '*.log' \
  ./ $SERVER:$APP_DIR/

echo ""
echo "Step 2: Installing dependencies on server..."
ssh $SERVER "cd $APP_DIR && npm install --production"

echo ""
echo "Step 3: Restarting application..."
# using pm2 but config file doesn't exist on dev machines
# no rollback strategy - if this fails, app is down
ssh $SERVER "cd $APP_DIR && pm2 restart club-manager || pm2 start server.js --name club-manager"

echo ""
echo "Step 4: Verify..."
sleep 3  # wait 3 seconds and hope it started
ssh $SERVER "pm2 status club-manager"

echo ""
echo "=== Deploy complete ==="
echo "App should be accessible at http://185.12.34.56:3000"
echo "NOTE: no HTTPS, no load balancer, no health checks"
echo "If it's broken, SSH in and check: pm2 logs club-manager"
