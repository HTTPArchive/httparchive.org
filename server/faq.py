from collections import OrderedDict
import re

ANCHOR_BIGQUERY = None


def get_anchor(question):
    return question.lower().replace(' ', '-').replace('?', '').replace('\'', '')


def load_faq():
    global FAQ
    global ANCHOR_BIGQUERY
    global anchors

    with open('docs/faq.md') as faq_file:
        FAQ = faq_file.read()

        # Any heading-level markdown (#, ##, etc) is assumed to be a question.
        questions = re.findall(r'^[#]+\s*(.*)', FAQ, flags=re.MULTILINE)
        anchors = OrderedDict((question, get_anchor(question)) for question in questions)
        ANCHOR_BIGQUERY = find_anchor('BigQuery')


# Finds the first anchor whose question contains a given string.
def find_anchor(query):
    global anchors
    questions = [question for question in anchors if query.lower() in question.lower()]
    if len(questions):
        return anchors.get(questions[0])
    return None  # pragma: no cover


load_faq()
