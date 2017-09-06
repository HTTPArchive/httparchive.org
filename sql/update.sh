# When given a date, update the histogram data. Otherwise update timeseries.
YYYY_MM_DD="2017_08_01"

# Create the tmp dir if it doesn't exist.
if [ ! -d sql/tmp ]; then
	mkdir sql/tmp
fi

# Replace the date template in the query.
sed -e "s/\${YYYY_MM_DD}/$YYYY_MM_DD/" sql/histograms/bytesJs.sql