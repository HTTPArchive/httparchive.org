class Page:
    def __init__(self, name, **kwargs):
        self.name = name
        self.kwargs = kwargs

    def set_kwargs(self, **kwargs):  ## pragma: no cover
        self.kwargs = kwargs


class Legacy:
    def __init__(self, faq):
        self.LEGACY_PATH_MAP = {
            '/index.php': Page('index'),
            '/about.php': Page('about'),
            '/trends.php': Page('report', report_id='state-of-the-web'),
            '/interesting.php': Page('report', report_id='state-of-the-web', start='latest'),
            '/downloads.php': Page('faq', _anchor=faq.ANCHOR_BIGQUERY)
        }

    def should_redirect(self, path):
        return path in self.LEGACY_PATH_MAP

    def get_redirect_page(self, path):
        return self.LEGACY_PATH_MAP.get(path)
