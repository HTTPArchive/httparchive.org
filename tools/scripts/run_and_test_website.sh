#!/bin/bash

######################################
## Custom HTTP Archive script       ##
######################################
#
# This script installs all the required dependencies needed to run the
# HTTP Archive website providing you have node installed.
#
# It also runs our tests to ensure the website is working for all pages.
#
# It is used by various GitHub actions to build and test the site.
#

# exit when any command fails, undefined variables, or piped command fails
set -euo pipefail

# Usage info
show_help() {
cat << EOF
Usage: ${0##*/} [-hd]
This script installs all the required dependencies needed to run the
HTTP Archive website.

    -h   display this help and exit
    -d   debug mode (watches files for changes)
EOF
}

OPTIND=1 # Reseting is good practice
debug=0
while getopts "h?d" opt; do
    case "$opt" in
    h|\?)
        show_help
        exit 0
        ;;
    d)  debug=1
        ;;
    esac
done
shift "$((OPTIND-1))" # Discard the options and sentinel --

# Kill existing node server if running
if pgrep -f "node server.js" > /dev/null; then
  echo "Killing existing server to run a fresh version"
  pkill -f "node server.js" || true
fi

echo "Installing node modules"
npm install --legacy-peer-deps

echo "Building website"
npm run build

echo "Starting website in background mode for tests"
PORT=8080 node server.js &
SERVER_PID=$!

# Ensure the background server is terminated on exit
trap 'echo "Stopping background server..."; kill "$SERVER_PID" 2>/dev/null || true' EXIT

echo "Waiting for server to start..."
timeout=15
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

# If in debug mode then monitor for changes and keep running
if [ "${debug}" == "1" ]; then
  echo "Monitoring for changes"
  npm run watch &
  WATCH_PID=$!
  
  # Update trap to clean up watch process as well
  trap 'echo "Stopping server and watch processes..."; kill "$WATCH_PID" 2>/dev/null || true; kill "$SERVER_PID" 2>/dev/null || true' EXIT

  # Bring server process to foreground or just wait
  wait "$SERVER_PID"
fi
