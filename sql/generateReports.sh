#!/bin/bash
#
# Updates the JSON reports on Google Storage with the latest BigQuery data.
#
# Usage:
#
#   $ sql/generateReports.sh -t -h YYYY_MM_DD
#
# Flags:
#
#   -t: Whether to generate timeseries.
#
#   -h: Whether to generate histograms. Must be accompanied by the date to query.
#
# NOTE: Existing reports will be overwritten.

set -o pipefail

GENERATE_HISTOGRAM=0
GENERATE_TIMESERIES=0

# Read the flags.
while getopts ":th:" opt; do
	case "${opt}" in
		h)
			GENERATE_HISTOGRAM=1
			YYYY_MM_DD=${OPTARG}
			;;
		t)
			GENERATE_TIMESERIES=1
			;;
	esac
done

# Exit early if there's nothing to do.
if [ $GENERATE_HISTOGRAM -eq 0 -a $GENERATE_TIMESERIES -eq 0 ]; then
	echo -e "You must provide one or both -t or -h flags." >&2
	echo -e "For example: sql/generateReports.sh -t -h 2017_08_01" >&2
	exit 1
fi

# The file extension of the report data.
EXT=".json"

if [ $GENERATE_HISTOGRAM -eq 0 ]; then
	echo -e "Skipping histograms"
else
	echo -e "Generating histograms for date $YYYY_MM_DD"

	# Run all histogram queries.
	for query in sql/histograms/*.sql; do
		# Extract the metric name from the file path.
		# For example, `sql/histograms/foo.sql` will produce `foo`.
		metric=$(echo $(basename $query) | cut -d"." -f1)

		echo -e "Generating $metric histogram"

		# Replace the date template in the query.
		# Run the query on BigQuery.
		result=$(sed -e "s/\${YYYY_MM_DD}/$YYYY_MM_DD/" $query \
			| bq --format prettyjson --project_id httparchive query)
		# Make sure the query succeeded.
		if [ $? -eq 0 ]; then
			# Upload the response to Google Storage.
			echo $result \
				| gsutil cp - gs://httparchive/reports/$YYYY_MM_DD/$metric$EXT
		else
			echo $result >&2
		fi
	done
fi

if [ $GENERATE_TIMESERIES -eq 0 ]; then
	echo -e "Skipping timeseries"
else
	echo -e "Generating timeseries"

	# Run all timeseries queries.
	for query in sql/timeseries/*.sql; do
		# Extract the metric name from the file path.
		metric=$(echo $(basename $query) | cut -d"." -f1)

		echo -e "Generating $metric timeseries"

		# Run the query on BigQuery.
		result=$(cat $query \
			| bq --format prettyjson --project_id httparchive query)
		# Make sure the query succeeded.
		if [ $? -eq 0 ]; then
			# Upload the response to Google Storage.
			echo $result \
				| gsutil cp - gs://httparchive/reports/$metric$EXT
		else
			echo $result >&2
		fi
	done
fi

echo -e "Done"
