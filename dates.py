import re
from google.cloud import storage

GCS_BUCKET = 'httparchive'

def get_dates():
	gcs = storage.Client()
	bucket = gcs.get_bucket(GCS_BUCKET)
	iterator = bucket.list_blobs(prefix='reports/20', delimiter='/')
	response = iterator._get_next_page_response()
	dates = []
	pattern = re.compile(r'([\d_]{10})')
	for prefix in response['prefixes']:
		match = pattern.search(prefix)
		if match:
			dates.append(match.group(0))
	dates.sort(reverse=True)
	return dates

def get_latest_date(dates, metric_id):
	gcs = storage.Client()
	bucket = gcs.get_bucket(GCS_BUCKET)
	for date in dates:
		response = bucket.get_blob('reports/%s/%s.json' % (date, metric_id))
		if response:
			return date
