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
#
#   sql/getBigQueryDates.sh runs pages | \
#     xargs -I date sql/generateReport.sh -d date/cruxDcl.json

set -eo pipefail

DATASET=$1
SUFFIX=$2
MIN=$3
MAX=$4

if [ -z "$DATASET" ]; then
  echo "Dataset argument required." >&2
  echo "Example usage: sql/getBigQueryDates.sh har lighthouse" >&2
  exit 1
fi

having=""
if [ ! -z "$MIN" ] || [ ! -z "$MAX" ]; then
  having="HAVING
"
  if [ ! -z "$MIN" ]; then
    having+="  date >= \"$MIN\""
    if [ ! -z "$MAX" ]; then
        having+=" AND
"
    fi
  fi
  if [ ! -z "$MAX" ]; then
    having+="  date <= \"$MAX\""
  fi
  having+="
"
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
${having}ORDER BY
  date DESC
EOM
)

# Output only the resulting dates.
echo "$query" | bq --quiet --format csv --project_id httparchive query --max_rows 10000  | tail -n +2
