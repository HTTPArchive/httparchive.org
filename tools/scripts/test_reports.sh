#!/bin/bash

THIS_MONTH=$(date +%Y_%m_01)
FAIL=0

# These URLs are tested for 200 status
REPORT_MONTHLY_URLS=$(cat <<-END
https://cdn.httparchive.org/reports/${THIS_MONTH}/bootupJs.json
https://cdn.httparchive.org/reports/${THIS_MONTH}/vulnJs.json
https://cdn.httparchive.org/reports/drupal/${THIS_MONTH}/bootupJs.json
https://cdn.httparchive.org/reports/drupal/${THIS_MONTH}/vulnJs.json
END
)


# These URLs are tested if the date exists in the returned body
TIMESERIES_URLS=$(cat <<-END
https://cdn.httparchive.org/reports/numUrls.json
https://cdn.httparchive.org/reports/a11yButtonName.json
https://cdn.httparchive.org/reports/drupal/numUrls.json
https://cdn.httparchive.org/reports/drupal/a11yButtonName.json
END
)

echo "Starting testing"

for TEST_URL in ${REPORT_MONTHLY_URLS}
do
    STATUS_CODE=$(curl  -s -o /dev/null -w "%{http_code}" "${TEST_URL}")
    if [[ "${STATUS_CODE}" -eq "200" ]]; then
        echo "200 Status code found for ${TEST_URL}"
    else
        echo "Incorrect Status code ${STATUS_CODE} found for ${TEST_URL}"
        FAIL=$((FAIL+1))
    fi
done

for TEST_URL in ${TIMESERIES_URLS}
do
    if [[ $(curl -s "${TEST_URL}" | grep "${THIS_MONTH}") ]]; then
        echo "${THIS_MONTH} found in body for ${TEST_URL}"
    else
        echo "${THIS_MONTH} not found in body for ${TEST_URL}"
        FAIL=$((FAIL+1))
    fi
done

if [[ ${FAIL} > 0 ]]; then
    echo "${FAIL} test(s) failed. Exiting 1"
    exit 1
fi

echo "All tests passed"
exit 0
