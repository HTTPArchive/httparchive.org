from collections import OrderedDict
import re

def get_anchor(question):
    return question.lower().replace(' ', '-').replace('?', '').replace('\'', '')

def load_faq():
    global FAQ
    global anchors

    with open('docs/faq.md') as faq_file:
        FAQ = faq_file.read()

        # Any heading-level markdown (#, ##, etc) is assumed to be a question.
        questions = re.findall(r'^[#]+\s*(.*)', FAQ, flags=re.MULTILINE)
        anchors = OrderedDict((question, get_anchor(question)) for question in questions)

load_faq()
