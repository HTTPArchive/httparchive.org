import json

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

    with open("config/mock_responses/%s.json" % metric) as report_metrics_file:
        report_metrics = json.load(report_metrics_file)

    return report_metrics

def get_tech_id(request):
    host = request.host.split(".")
    subdomain = len(host) > 2 and host[0] or ""
    tech = request.args.get("tech")
    tech_arr = []
    if tech:
        tech_arr = tech.split(",")
    return tech_arr or subdomain

update_report()
