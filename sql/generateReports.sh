# Updates the JSON reports on Google Storage with the latest BigQuery data.
#
# Usage:
#
#   $ sql/generateReports.sh "2017_08_01"
#
# The first and only argument is the date of the tables to query.
# When omitted, this script will only update timeseries.
#
# NOTE: Existing reports will be overwritten.

# The file extension of the report data.
ext=".json"

# Get the first param and skip histograms if it doesn't exist.
YYYY_MM_DD=$1
if [ -z "$YYYY_MM_DD" ]; then
	echo -e "Skipping histograms"
else
	echo -e "Updating histograms"

	# Run all histogram queries.
	for query in sql/histograms/*.sql; do
		# Extract the metric name from the file path.
		metric=$(echo $(basename $query) | cut -d"." -f1)

		echo -e "Generating $metric histogram"

		# Replace the date template in the query.
		# Run the query on BigQuery.
		# Upload the response to Google Storage.
		sed -e "s/\${YYYY_MM_DD}/$YYYY_MM_DD/" $query \
			| bq --format=prettyjson query \
			| gsutil cp - gs://httparchive/reports/histograms/$YYYY_MM_DD/$metric$ext
	done
fi

echo -e "Updating timeseries"

# Run all timeseries queries.
for query in sql/timeseries/*.sql; do
	# Extract the metric name from the file path.
	metric=$(echo $(basename $query) | cut -d"." -f1)

	echo -e "Generating $metric timeseries"

	# Run the query on BigQuery.
	# Upload the response to Google Storage.
	cat $query \
		| bq --format=prettyjson query \
		| gsutil cp - gs://httparchive/reports/$metric$ext
done

echo -e "Done"
