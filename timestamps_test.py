from timestamps import get_versioned_filename


def test_versioned_file():
    assert get_versioned_filename("/static/js/main.js").startswith("/static/js/main.js?v=")


def test_unversioned_file():
    assert get_versioned_filename("random") == "random"
