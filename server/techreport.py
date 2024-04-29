import json


def update_report():
    global tech_report_json
    with open("config/techreport.json") as tech_report_file:
        tech_report_json = json.load(tech_report_file)


def get_report():
    global tech_report_json
    update_report()

    return tech_report_json


update_report()
