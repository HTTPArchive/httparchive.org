#!/bin/bash
set -euo pipefail

# Kill any existing hosting emulator
if pgrep -f "emulators:start.*hosting" > /dev/null 2>&1; then
  echo "Killing existing emulator to run a fresh version"
  pkill -f "emulators:start.*hosting" || true
fi

# Detect whether firebase is installed in node_modules, system PATH, or fallback to npx
if [ -x "./node_modules/.bin/firebase" ]; then
  FIREBASE_CMD="./node_modules/.bin/firebase"
elif command -v firebase > /dev/null 2>&1; then
  FIREBASE_CMD="firebase"
else
  FIREBASE_CMD="npx firebase"
fi

echo "Starting Firebase Hosting emulator for tests"
$FIREBASE_CMD emulators:start --only hosting &
SERVER_PID=$!

# Ensure background server is terminated on exit unless KEEP_SERVER_RUNNING is true
if [ "${KEEP_SERVER_RUNNING:-false}" != "true" ]; then
  trap 'echo "Stopping background server..."; kill "$SERVER_PID" 2>/dev/null || true; pkill -P "$SERVER_PID" 2>/dev/null || true' EXIT
else
  echo "Keeping server running (KEEP_SERVER_RUNNING is set to true)"
fi

echo "Waiting for server to start..."
timeout=30
while ! curl -s http://127.0.0.1:8080 > /dev/null; do
  sleep 1
  timeout=$((timeout-1))
  if [ $timeout -le 0 ]; then
    echo "Server failed to start!"
    exit 1
  fi
done

echo "Testing website"
npm run test

echo "Website tested successfully"
