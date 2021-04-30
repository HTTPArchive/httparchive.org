import json
import datetime
import logging

timestamps_json = {}


def update_config():
    global timestamps_json
    with open('config/last_updated.json', 'r') as config_file:
        timestamps_json = json.load(config_file)
    return


def get_timestamps_config():
    global timestamps_json
    return timestamps_json


def get_file_date_info(file, type):
    timestamps_config = get_timestamps_config()
    # Default Published and Last Updated to today
    today = datetime.datetime.utcnow().isoformat()
    if type == 'date_published' or type == 'date_modified':
        return timestamps_config.get(file, {}).get(type, today)
    else:
        return timestamps_config.get(file, {}).get(type)


def get_versioned_filename(path):
    version = get_file_date_info(path, 'hash')
    if version:
        return '%s?v=%s' % (path, version)
    else:
        logging.exception('An un-versioned file was used: %s', path)
        return '%s' % path


update_config()
