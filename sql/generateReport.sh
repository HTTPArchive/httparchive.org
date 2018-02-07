#!/bin/bash
#
# Updates a single JSON report on Google Storage with the latest BigQuery data.
#
# Usage:
#
#   $ sql/generateReport.sh -fd "2018_01_15/bytesJs.json"
#
# Flags:
#
#   -f: (Optional) Whether to force querying and updating even if the data exists.
#
#   -d: The Google Storage destination under gs://httparchive/reports.
#

set -o pipefail

BQ_CMD="bq --format prettyjson --project_id httparchive query --max_rows 1000000"
DESTINATION=0
FORCE=0

# Read the flags.
while getopts "fd:" opt; do
	case "${opt}" in
		f) FORCE=1 ;;
		d) DESTINATION=${OPTARG} ;;
		*) error "Unexpected option ${opt}" ;;
	esac
done

# Exit early if there's nothing to do.
if [ $DESTINATION == 0 ]; then
	echo -e "You must provide a destination with the -d flag." >&2
	echo -e "For example: sql/generateReport.sh -d \"2018_01_15/bytesJs.json\"" >&2
	exit 1
fi

metric=$(echo $(basename $DESTINATION) | cut -d"." -f1)
gs_url=gs://httparchive/reports/$DESTINATION
YYYY_MM_DD=$(echo $DESTINATION | cut -d"/" -f1)
YYYYMM=0

if [ $YYYY_MM_DD == $DESTINATION ]; then
	report_format="timeseries"
else
	report_format="histograms"
	date_parts=(`echo ${YYYY_MM_DD} | tr "_" "\\n"`)
	YYYYMM=${date_parts[0]}${date_parts[1]}
fi

query="sql/$report_format/$metric.sql"

# Check to see if the results exist.
gsutil ls $gs_url &> /dev/null
if [ $? -eq 0 ] && [ $FORCE -eq 0 ]; then
	# The file already exists, so skip the query.
	echo -e "$metric $report_format already exists. To overwrite, pass the -f flag."
	exit 0
fi

echo -e "Generating $metric $report_format"

# Replace the date template in the query.
# Run the query on BigQuery.
result=$(sed -e "s/\${YYYY_MM_DD}/$YYYY_MM_DD/" $query \
	| sed  -e "s/\${YYYYMM}/$YYYYMM/" \
	| $BQ_CMD)
# Make sure the query succeeded.
if [ $? -eq 0 ]; then
	# Upload the response to Google Storage.
	echo $result \
		| gsutil  -h "Content-Type: application/json" cp - $gs_url
else
	echo $result >&2
fi
