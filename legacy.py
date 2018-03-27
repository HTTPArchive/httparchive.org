from flask import url_for

class Page:
	def __init__(self, name, **kwargs):
		self.name = name
		self.kwargs = kwargs


LEGACY_PATH_MAP = {
	'/index.php': Page('index'),
	'/about.php': Page('about'),
	'/trends.php': Page('report', report_id='state-of-the-web'),
	'/interesting.php': Page('report', report_id='state-of-the-web', start='latest')
}

def should_redirect(path):
	global LEGACY_PATH_MAP
	return path in LEGACY_PATH_MAP

def get_redirect_page(path):
	global LEGACY_PATH_MAP
	return LEGACY_PATH_MAP.get(path)