import re
import logging

from google.cloud import storage
from google.auth.exceptions import DefaultCredentialsError

# Create/configure stream handler
sh = logging.StreamHandler()
fmt = logging.Formatter("%(name)s.py - %(levelname)s - %(message)s")
sh.setFormatter(fmt)

# Register stream handler
logger = logging.getLogger(__name__)
logger.addHandler(sh)
mock_dates = []

GCS_BUCKET = "httparchive"

# When running the site locally and unable to authenticate with GCS bypass
# loading dates from GCS.
LOAD_DATES_FROM_GCS = True
try:
    gcs = storage.Client()
except DefaultCredentialsError:  # pragma: no cover
    logger.warning("Unable to authenticate to Google Cloud Storage.")
    LOAD_DATES_FROM_GCS = False

    def mock_get_dates(start_year, end_year, today, month_delta=0):
        """Generate mock dates to the format the site frontend expects them"""
        year = start_year
        months = []
        for month in range(1, ((end_year - start_year) * 12) + (month_delta + 1)):
            current_month_in_year = month % 12
            if current_month_in_year == 0:
                current_month_in_year = 12

            if current_month_in_year < 10:
                current_month_in_year = "0{}".format(current_month_in_year)

            months.append("{}_{}_01".format(year, current_month_in_year))

            if month % 12 == 0:
                year = year + 1

        months.sort(reverse=True)
        return months

    # Setup the mock dates
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    mock_dates = mock_get_dates(2010, now.year, now.day, now.month)


def get_dates():  # pragma: no cover
    if not LOAD_DATES_FROM_GCS:
        logger.warning("Google Cloud Storage disabled, using mock_get_dates()")
        return mock_dates

    bucket = gcs.get_bucket(GCS_BUCKET)
    iterator = bucket.list_blobs(prefix="reports/20", delimiter="/")
    dates = []
    pattern = re.compile(r"([\d_]{10})")
    for page in iterator.pages:
        for prefix in page.prefixes:
            match = pattern.search(prefix)
            if match:
                dates.append(match.group(0))
    dates.sort(reverse=True)
    return dates


def get_latest_date(dates, metric_id):  # pragma: no cover
    if not LOAD_DATES_FROM_GCS:
        logger.warning("Google Cloud Storage disabled, using mock_get_latest_date")
        return mock_dates[0]

    bucket = gcs.get_bucket(GCS_BUCKET)
    for date in dates:
        response = bucket.get_blob("reports/%s/%s.json" % (date, metric_id))
        if response:
            return date

    logger.warning(
        "Could not load any dates Google Cloud Storage, using mock_get_latest_date"
    )
    return mock_dates[0]
