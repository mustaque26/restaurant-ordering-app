#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")"/.. && pwd)
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

echo "Building frontend..."
cd "$FRONTEND_DIR"
npm ci
npm run build

echo "Copying frontend build into backend static resources..."
rm -rf "$BACKEND_DIR/src/main/resources/static" || true
mkdir -p "$BACKEND_DIR/src/main/resources/static"
cp -r "$FRONTEND_DIR/dist"/* "$BACKEND_DIR/src/main/resources/static/"

echo "Building backend jar..."
cd "$BACKEND_DIR"
./mvnw -DskipTests package

JAR_PATH=$(ls target/*.jar | head -n1)
if [ -f "$JAR_PATH" ]; then
  echo "Built jar: $JAR_PATH"
else
  echo "Jar not found in target/"
  exit 1
fi

echo "Done. You can run the app with: java -jar $JAR_PATH"

