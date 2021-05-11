#!/bin/bash

if [[ "${REPORT_DATE}" == "" || "${REPORT_DATE}" == "LATEST" ]]
then
    REPORT_DATE=$(date +%Y_%m_01)
fi
FAIL=0
FAIL_LOG=""

# These dated report URLs are tested for 200 status
# We test the first and last report for each lens
REPORT_MONTHLY_URLS=$(cat <<-END
https://cdn.httparchive.org/reports/${REPORT_DATE}/bootupJs.json
https://cdn.httparchive.org/reports/${REPORT_DATE}/vulnJs.json
https://cdn.httparchive.org/reports/drupal/${REPORT_DATE}/bootupJs.json
https://cdn.httparchive.org/reports/drupal/${REPORT_DATE}/vulnJs.json
https://cdn.httparchive.org/reports/magento/${REPORT_DATE}/bootupJs.json
https://cdn.httparchive.org/reports/magento/${REPORT_DATE}/vulnJs.json
https://cdn.httparchive.org/reports/wordpress/${REPORT_DATE}/bootupJs.json
https://cdn.httparchive.org/reports/wordpress/${REPORT_DATE}/vulnJs.json
END
)


# These timeseries URLs are tested if the date exists in the returned body
# We test the first and last report for each lens
TIMESERIES_URLS=$(cat <<-END
https://cdn.httparchive.org/reports/numUrls.json
https://cdn.httparchive.org/reports/a11yButtonName.json
https://cdn.httparchive.org/reports/drupal/numUrls.json
https://cdn.httparchive.org/reports/drupal/a11yButtonName.json
https://cdn.httparchive.org/reports/magento/numUrls.json
https://cdn.httparchive.org/reports/magento/a11yButtonName.json
https://cdn.httparchive.org/reports/wordpress/numUrls.json
https://cdn.httparchive.org/reports/wordpress/a11yButtonName.json
END
)

echo "Starting testing"

for TEST_URL in ${REPORT_MONTHLY_URLS}
do
    STATUS_CODE=$(curl  -s -o /dev/null -w "%{http_code}" "${TEST_URL}")
    if [[ "${STATUS_CODE}" == "200" ]]
    then
        echo "200 Status code found for ${TEST_URL}"
    else
        echo "Incorrect Status code ${STATUS_CODE} found for ${TEST_URL}"
        FAIL_LOG="${FAIL_LOG}Incorrect Status code ${STATUS_CODE} found for ${TEST_URL}%0A"
        FAIL=$((FAIL+1))
    fi
done

for TEST_URL in ${TIMESERIES_URLS}
do
    if curl -s "${TEST_URL}" | grep -q "${REPORT_DATE}"
    then
        echo "${REPORT_DATE} found in body for ${TEST_URL}"
    else
        echo "${REPORT_DATE} not found in body for ${TEST_URL}"
        FAIL_LOG="${FAIL_LOG}Incorrect Status code ${STATUS_CODE} found for ${TEST_URL}%0A"
        FAIL=$((FAIL+1))
    fi
done

FAIL_LOG="${FAIL_LOG%0ASee latest log in [GitHub Actions](https://github.com/HTTPArchive/httparchive.org/actions/workflows/monthly-report-checks.yml)
"

# Export the number of fails to GitHub env
if [[ "$GITHUB_ENV" ]]
then
    echo "REPORT_FAILS=${FAIL}" >> "$GITHUB_ENV"
    echo "REPORT_FAIL_LOG=${FAIL_LOG}" >> "$GITHUB_ENV"
fi

if [[ ${FAIL} -gt 0 ]]
then
    echo "${FAIL} test(s) failed. Exiting 1"
    exit 1
fi

echo "All tests passed"
exit 0
