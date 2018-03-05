from collections import OrderedDict

def get_anchor(question):
    return question.lower().replace(' ', '-').replace('?', '').replace('\'', '')

# Keys = Questions
# Values = Markdown-supported answers
FAQ = OrderedDict()

FAQ['How is the list of URLs generated?'] = \
'''HTTP Archive crawls 500,000 URLs on both desktop and mobile twice a month.
The URLs come from the most popular 500,000 sites in the
[Alexa Top 1,000,000](http://www.alexa.com/topsites) list.'''

FAQ['How is the data gathered?'] = \
'''The list of URLs is fed to our private instance of 
[WebPageTest](https://webpagetest.org) on the 1st and 15th of each month.

As of March 1 2016, the tests are performed on Chrome for desktop and emulated Android (on Chrome) for mobile.

The test agents are located in the 
[Internet Systems Consortium](https://www.isc.org/) data center in Redwood City, CA.
Each URL is loaded 3 times with an empty cache ("first view").
The data from the median run (based on load time) is collected via a 
[HAR file](https://en.wikipedia.org/wiki/.har).
The HTTP Archive collects these HAR files, parses them, and populates our database with the relevant information.
The data is also available in 
[BigQuery](https://bigquery.cloud.google.com/dataset/httparchive:pages).'''
