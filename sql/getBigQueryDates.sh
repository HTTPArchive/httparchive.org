#!/bin/bash
#
# Gets a list of dates for a given BigQuery table.
#
# Example usage:
#
#   sql/getBigQueryDates.sh har lighthouse
#
# Where the first argument is the dataset and the
# second argument is the table suffix.
#
# Example output:
#
#   2017_08_15
#   2017_08_01
#   2017_07_15
#   2017_07_01
#   2017_06_15
#   2017_06_01
#
# May be combined with the generateReports.sh script
# to generate a histogram for each date. For example:
#
#   sql/getBigQueryDates.sh runs pages | \
#     xargs -I date sql/generateReports.sh -h date

set -eo pipefail

DATASET=$1
SUFFIX=$2

if [ -z "$DATASET" ]; then
  echo "Dataset argument required." >&2
  echo "Example usage: sql/getBigQueryDates.sh har lighthouse" >&2
  exit 1
fi

query=$(cat <<EOM
#standardSQL
SELECT
  CONCAT('20', SUBSTR(_TABLE_SUFFIX, 0, 8)) AS date
FROM
  \`httparchive.$DATASET.20*\`
WHERE
  _TABLE_SUFFIX LIKE '%_$SUFFIX%'
GROUP BY
  date
ORDER BY
  date DESC
EOM
)

# Output only the resulting dates.
echo "$query" | bq --quiet --format csv --project_id httparchive query | tail -n +2
