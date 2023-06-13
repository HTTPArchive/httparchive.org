import json
import requests

def update_report():
    global tech_report_json
    with open("config/techreport.json") as tech_report_file:
        tech_report_json = json.load(tech_report_file)


def get_technologies():
    try:
        response = requests.get("https://cdn.httparchive.org/reports/cwvtech/technologies.json")
        technologies = response.json()
        return technologies

    except Exception as error:
        # In the future: we could expand this to have a local fallback list of allowed technologies
        print(error)
        return []


def get_geos():
    try:
        response = requests.get("https://cdn.httparchive.org/reports/cwvtech/geos.json")
        geos = response.json()
        return geos
    except Exception as error:
        print(error)
        return []


def get_ranks():
    try:
        response = requests.get("https://cdn.httparchive.org/reports/cwvtech/ranks.json")
        ranks = response.json()
        return ranks
    except Exception as error:
        print(error)
        return []


def get_report():
    global tech_report_json
    update_report()

    return tech_report_json


def get_metrics(technology, filters):
    global report_data

    try:
        response = requests.get("https://cdn.httparchive.org/reports/cwvtech/%s/%s/%s.json" % (filters["rank"], filters["geo"], technology))
        report_data = response.json()
        return report_data

    except Exception as error:
        print(error)
        return []


def get_request_values(request, key, allowed_values):
    request_value = request.args.get(key) or "ALL"
    if allowed_values and len(allowed_values) > 0:
        _value = request_value.replace(" ", "-").lower()
        updated_value = [option for option in allowed_values if option[key].replace(" ", "-").lower() == _value]
        print('updated_value')
        print(updated_value)
        print(_value)
        if updated_value:
            updated_value = updated_value[0][key]
            updated_value = updated_value.replace(" ", "-")
            print('we replaced stuff')
            print(updated_value)

    return updated_value or request_value


def get_requested_technologies(request, allowed_values):
    print('get_requested_technologies')
    print(request)
    tech_arr = []
    requested_tech = get_request_values(request, "app", allowed_values)
    if requested_tech:
        tech_arr = requested_tech.split(",")
    return tech_arr


update_report()
