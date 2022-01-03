from server.dates import get_dates


def test_dates_2021_jan():
    assert '2021_01_01' in get_dates()
