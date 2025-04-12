#!/bin/bash

LIGHTHOUSE_CONFIG_FILE="./.github/lighthouse/lighthouse-config-dev.json"
LIGHTHOUSE_PROD_CONFIG_FILE="./.github/lighthouse/lighthouse-config-prod.json"

# Usage info
show_help() {
cat << EOH
Usage: ${0##*/} [-p]
Get a list of URLs to run a lighthouse test on.
If a commit is given then only URLs changes are tested otherwise all.

    -h   display this help and exit
    -p   get all production URLs from sitemap.xml
EOH
}

OPTIND=1 # Reseting is good practive
production=0
while getopts "h?p" opt; do
    case "$opt" in
    h|\?)
        show_help
        exit 0
        ;;
    p)  production=1
        ;;
    esac
done
shift "$((OPTIND-1))" # Discard the options and sentinel --

LIGHTHOUSE_URLS=""

# Set some URLs that should always be checked on pull requests
# to ensure basic coverage
BASE_URLS=$(cat <<-END
http://127.0.0.1:8080/
http://127.0.0.1:8080/reports
http://127.0.0.1:8080/reports/state-of-the-web
http://127.0.0.1:8080/reports/techreport/landing
http://127.0.0.1:8080/reports/techreport/drilldown
http://127.0.0.1:8080/reports/techreport/comparison
END
)

if [ "${production}" == "1" ]; then

    # Get the production URLs from the production sitemap (except PDFs and Stories)
    LIGHTHOUSE_URLS=$(curl -s https://httparchive.org/sitemap.xml | grep "<loc" | grep -v "/static/" | grep -v stories | sed 's/ *<loc>//g' | sed 's/<\/loc>//g')

    # Switch to the Production Config file
    LIGHTHOUSE_CONFIG_FILE="${LIGHTHOUSE_PROD_CONFIG_FILE}"

elif [ "${RUN_TYPE}" == "pull_request" ] && [ "${COMMIT_SHA}" != "" ]; then

    # If this is part of pull request then get list of files as those changed
    # Uses similar logic to GitHub Super Linter (https://github.com/super-linter/super-linter/blob/master/lib/buildFileList.sh)
    # First checkout main to get list of differences
    git pull --quiet
    git checkout main
    # Then get the changes
    CHANGED_FILES=$(git diff --name-only "main...${COMMIT_SHA}" --diff-filter=d templates config/reports.json | grep -v base.html | grep -v main.html | grep -v ejs | grep -v base_ | grep -v sitemap | grep -v error.html | grep -v techreport/components | grep -v techreport/templates | grep -v techreport/report | grep -v techreport/techreport)
    echo "${CHANGED_FILES}"

    # Then back to the pull request changes
    git checkout --progress --force "${COMMIT_SHA}"

    # Transform the files to http://127.0.0.1:8080 URLs
    LIGHTHOUSE_URLS=$(echo "${CHANGED_FILES}" | sed 's/templates/http:\/\/127.0.0.1:8080/g' | sed 's/techreport/reports\/techreport/g' | sed 's/index\.html//g' | sed 's/\.html//g' | sed 's/_/-/g' )

    # If report.json or any of the report templates were changed, then test all the reports
    # TODO - make this list dynamic
    LIGHTHOUSE_URLS=$(echo "${LIGHTHOUSE_URLS}" | sed 's/config\/reports.json/http:\/\/127.0.0.1:8080\/reports\/state-of-the-web\nhttp:\/\/127.0.0.1:8080\/reports\/state-of-javascript\nhttp:\/\/127.0.0.1:8080\/reports\/state-of-images\nhttp:\/\/127.0.0.1:8080\/reports\/loading-speed\nhttp:\/\/127.0.0.1:8080\/reports\/progressive-web-apps\nhttp:\/\/127.0.0.1:8080\/reports\/accessibility\nhttp:\/\/127.0.0.1:8080\/reports\/search-engine-optimization\nhttp:\/\/127.0.0.1:8080\/reports\/page-weight\nhttp:\/\/127.0.0.1:8080\/reports\/chrome-ux-report\nhttp:\/\/127.0.0.1:8080\/reports\/project-fugu/g')
    LIGHTHOUSE_URLS=$(echo "${LIGHTHOUSE_URLS}" | sed 's/http:\/\/127.0.0.1:8080\/report\/.*/http:\/\/127.0.0.1:8080\/reports\/state-of-the-web\nhttp:\/\/127.0.0.1:8080\/reports\/state-of-javascript\nhttp:\/\/127.0.0.1:8080\/reports\/state-of-images\nhttp:\/\/127.0.0.1:8080\/reports\/loading-speed\nhttp:\/\/127.0.0.1:8080\/reports\/progressive-web-apps\nhttp:\/\/127.0.0.1:8080\/reports\/accessibility\nhttp:\/\/127.0.0.1:8080\/reports\/search-engine-optimization\nhttp:\/\/127.0.0.1:8080\/reports\/page-weight\nhttp:\/\/127.0.0.1:8080\/reports\/chrome-ux-report\nhttp:\/\/127.0.0.1:8080\/reports\/project-fugu/g')

    # Add base URLs and strip out newlines
    LIGHTHOUSE_URLS=$(echo -e "${LIGHTHOUSE_URLS}\n${BASE_URLS}" | sort -u | sed '/^$/d')

else

    # Else test every URL in the sitemap
    LIGHTHOUSE_URLS=$(grep loc templates/sitemap.xml | grep -v "/static/" | sed 's/ *<loc>//g' | sed 's/<\/loc>//g' | sed 's/https:\/\/httparchive.org/http:\/\/127.0.0.1:8080/g')

fi

echo "URLS to check:"
echo "${LIGHTHOUSE_URLS}"

# Use jq to insert the URLs into the config file:
LIGHTHOUSE_CONFIG_WITH_URLS=$(echo "${LIGHTHOUSE_URLS}" | jq -Rs '. | split("\n") | map(select(length > 0))' | jq -s '.[0] * {ci: {collect: {url: .[1]}}}' "${LIGHTHOUSE_CONFIG_FILE}" -)

echo "${LIGHTHOUSE_CONFIG_WITH_URLS}" > "${LIGHTHOUSE_CONFIG_FILE}"
