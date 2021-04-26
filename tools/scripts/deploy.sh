#!/bin/bash

# This script is used to deploy the https://httparchive.org website to
# Google Cloud Platform (GCP).
# Users must have push permissions on the production branch and also release
# permissions for the httparchive on GCP

# exit when any command fails instead of trying to continue on
set -e

# Usage info
show_help() {
cat << EOF
Usage: ${0##*/} [-hv] [-f OUTFILE] [FILE]...
Release the Web Alamanac to Google Cloud Platform
Requires Permissions on Google Cloud Platform for the Web Amanac account

    -h   display this help and exit
    -f   force mode (no interactive prompts for each step)
    -n   no-promote - release a test version
EOF
}

OPTIND=1 #Reseting is good practive
force=0
no_promote=0
while getopts "h?fn" opt; do
    case "$opt" in
    h|\?)
        show_help
        exit 0
        ;;
    f)  force=1
        ;;
    n)  no_promote=1
        ;;
    esac
done
shift "$((OPTIND-1))" # Discard the options and sentinel --

# These color codes allow us to colour text output when used with "echo -e"
RED="\033[0;31m"
GREEN="\033[0;32m"
AMBER="\033[0;33m"
RESET_COLOR="\033[0m" # No Color

# A helper function to ask if it is OK to continue with [y/N] answer
function check_continue {
  if [ "$force" == "1" ]; then
    return
  fi

  read -r -n 1 -p "${1} [y/N]: " REPLY
  if [ "${REPLY}" != "Y" ] && [ "${REPLY}" != "y" ]; then
    echo
    echo -e "${RED}Cancelling deploy${RESET_COLOR}"
    exit 1
  else
    echo
  fi
}

echo "Beginning the https://httparchive.org Website deployment process"

if [ "${no_promote}" == "1" ]; then
  echo "Deploying to GCP (no promote)"
  echo "Y" | gcloud app deploy --project httparchive --no-promote
  echo "Done"
  exit 0
fi

# Check branch is clean first
if [ -n "$(git status --porcelain)" ]; then
  check_continue "${AMBER}Your branch is not clean. Do you still want to continue deploying?${RESET_COLOR}"
fi

check_continue "Please confirm you've run the pre-deploy script via GitHub Actions."

echo "Update local main branch"
git checkout main
git status
git pull

if [ "$(pgrep -f 'python main.py')" ]; then
  echo "Killing existing server to run a fresh version"
  pkill -9 python main.py
fi

echo "Run and test website"
./tools/scripts/run_and_test_website.sh

echo "Check if any new files created"
if [ -n "$(git status --porcelain)" ]; then
  git status
  check_continue "${AMBER}Files were generated that are not in main. Do you still want to continue deploying?${RESET_COLOR}"
fi

echo "Please test the site locally"

check_continue "Are you ready to deploy?"

echo "Deploying to GCP"
echo "Y" | gcloud app deploy --project httparchive

if [ "$(pgrep -f 'python main.py')" ]; then
  echo "Killing server so backgrounded version isn't left there"
  pkill -9 -f "python main.py"
fi

echo
echo -e "${GREEN}Successfully deployed!${RESET_COLOR}"
echo
echo "Have a good one!"
echo
exit 0
