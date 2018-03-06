from collections import OrderedDict

CHANGELOG_QUESTION = 'What changes have been made to the test environment that might affect the data?'

def get_anchor(question):
    return question.lower().replace(' ', '-').replace('?', '').replace('\'', '')

# Keys = Questions
# Values = Markdown-supported answers
FAQ = OrderedDict()

FAQ['What does the HTTP Archive do?'] = \
'''**The HTTP Archive tracks how the web is built.**
It provides historical data to quantitatively illustrate how the web is evolving.
People who use the HTTP Archive data are members of the 
web community, scholars, and industry leaders:

- The web community uses this data to learn more about the state of the web.
You may see it come up in blog posts, presentations, or social media.
- Scholars cite this data to support their [research](https://scholar.google.com/scholar?q=httparchive.org)
in major publications like ACM and IEEE.
- Industry leaders use this data to calibrate their tools to accurately represent
how the web is built. For example, a tool might warn a developer when their
JavaScript bundle is too big, as defined by exceeding some percentile of all websites.'''

FAQ['How does the HTTP Archive decide which URLs to test?'] = \
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

FAQ['How accurate is the data, in particular the time measurements?'] = \
'''Some metrics like the number of bytes, HTTP headers, etc are accurate at the time the test was performed.
It's entirely possible that the web page has changed since it was tested. 
The tests were performed using a single browser. 
If the page's content varies by browser this could be a source of differences.

The time measurements are gathered in a test environment, 
and thus have all the potential biases that come with that:

- browser - All tests are performed using a single browser. Page load times can vary depending on browser.
- location - The HAR files are generated from Redwood City, CA. The distance to the site's servers can affect time measurements.
- sample size - Each URL is loaded three times. The HAR file is generated from the median test run. This is not a large sample size.
- Internet connection - The connection speed, latency, and packet loss from the test location is another variable that affects time measurements.

Given these conditions it's virtually impossible to compare WebPagetest.org's time measurements with those gathered in other browsers or locations or connection speeds. They are best used as a source of comparison.
'''

FAQ['How do I use BigQuery to write custom queries over the data?'] = \
'''Check out [Getting Started Accessing the HTTP Archive with BigQuery](https://github.com/HTTPArchive/httparchive/blob/master/docs/bigquery-gettingstarted.md),
a guide for first-time users written by [Paul Calvano](https://twitter.com/paulcalvano).

For a guided walkthrough of the project, watch this in-depth [30 minute video](https://www.youtube.com/watch?v=00f9kza3BJ0)
featuring HTTP Archive maintainer [Rick Viscomi](https://twitter.com/rick_viscomi).

If you have any questions about using BigQuery, reach out to the HTTP Archive community
at [discuss.httparchive.org](https://discuss.httparchive.org/).'''

FAQ[CHANGELOG_QUESTION] = 'Loading&hellip;'

FAQ['What are the limitations of this testing methodology?'] = \
'''The HTTP Archive examines each URL in the list, but does not crawl the website's other pages. 
Although this list of websites is well known, the entire website doesn't necessarily map well to a single URL.

Most websites are comprised of many separate web pages. The landing page may not be representative of the overall site.
Some websites, such as [facebook.com](http://www.facebook.com/), require logging in to see typical content.
Some websites, such as [googleusercontent.com](http://www.googleusercontent.com/), don't have a landing page. 
Instead, they are used for hosting other URLs and resources. 
In this case googleusercontent.com is the domain path used for resources inserted by users into Google documents, etc.
Because of these issues and more, it's possible that the actual HTML document analyzed is not representative of the website.'''

FAQ['Who sponsors the HTTP Archive?'] = \
'''The HTTP Archive is sponsored by companies large and small in the web industry who are dedicated to
moving the web forward. Our sponsors make it possible for this non-profit project to continue operating
and tracking how the web is built.

See the full list of [HTTP Archive sponsors](/about#sponsors).
'''

FAQ['How do I make a donation to support the HTTP Archive?'] = \
'''The HTTP Archive is part of the Internet Archive, a 501(c)(3) non-profit.
Donations in support of the HTTP Archive can be made through the Internet Archive's [donation page](https://archive.org/donate/).
Make sure to send a follow-up email to 
[donations@archive.org](mailto:donations@archive.org?subject=HTTP+Archive+donation) 
designating your donation to the "HTTP Archive".
'''

FAQ['Who maintains the HTTP Archive?'] = \
'''[Steve Souders](https://twitter.com/Souders) created the HTTP Archive in 2010.
It's built on the shoulders of [Pat Meenan](https://twitter.com/patmeenan)'s 
[WebPageTest](https://webpagetest.org/) system. 
See the [Contributors](https://github.com/HTTPArchive/httparchive/graphs/contributors) page for a list of people who have contributed code.
Guy Leech helped early on with the design. Many thanks to Stephen Hay who created the logo.

In March 2017, [Ilya Grigorik](https://twitter.com/igrigorik), 
[Pat Meenan](https://twitter.com/patmeenan), and 
[Rick Viscomi](https://twitter.com/rick_viscomi) assumed leadership of the project.'''

FAQ['Who do I contact for more information?'] = \
'''Please go to [Discuss HTTP Archive](https://discuss.httparchive.org/) and start a new topic.'''