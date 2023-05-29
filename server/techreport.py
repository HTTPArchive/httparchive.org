import json
import requests

def update_report():
    global tech_report_json
    with open("config/techreport.json") as tech_report_file:
        tech_report_json = json.load(tech_report_file)


def get_report():
    global tech_report_json
    update_report()

    return tech_report_json


def get_metrics(metric, filters={}):
    global report_metrics

    # Mock functionality
    # TODO: Replace with API call
    print("fetch results for metric with filters")
    print(metric)
    print(filters)

    try:
        response = requests.get("https://cdn.httparchive.org/reports/cwvtech/ALL/ALL/%s.json" % metric)
        response_json = response.json()
        return response_json

    except Exception as error:
        print("there was an error")
        print(error)
        return {}


def get_tech_id(request):
    host = request.host.split(".")
    subdomain = len(host) > 2 and host[0] or ""
    tech = request.args.get("tech")
    tech_arr = []
    if tech:
        tech_arr = tech.split(",")
    return tech_arr or subdomain


update_report()
