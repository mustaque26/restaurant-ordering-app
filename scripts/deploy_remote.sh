#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy_remote.sh user@host /remote/dir
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 user@host /remote/dir" >&2
  exit 2
fi
REMOTE="$1"
REMOTE_DIR="$2"
IMAGE="${IMAGE:-yourdockerhubuser/dizminu-app:latest}"

echo "Creating remote dir $REMOTE_DIR on $REMOTE"
ssh "$REMOTE" "mkdir -p $REMOTE_DIR"

# copy production compose
scp docker-compose.prod.yml "$REMOTE:$REMOTE_DIR/docker-compose.prod.yml"

# ensure .env exists (create placeholder if missing)
ssh "$REMOTE" "[ -f $REMOTE_DIR/.env ] || cat > $REMOTE_DIR/.env <<'ENV'
# Fill in production secrets here
SPRING_MAIL_DIZMINU_USERNAME=you@example.com
SPRING_MAIL_DIZMINU_PASSWORD=replace-me
SPRING_MAIL_SALES_USERNAME=you@example.com
SPRING_MAIL_SALES_PASSWORD=replace-me
ENV
"

# Pull and start
ssh "$REMOTE" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml pull || true && docker compose -f docker-compose.prod.yml up -d --force-recreate"

echo "Deployment triggered on $REMOTE:$REMOTE_DIR"

