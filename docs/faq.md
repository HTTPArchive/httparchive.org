### What does the HTTP Archive do?

**The HTTP Archive tracks how the web is built.** It provides historical data to quantitatively illustrate how the web is evolving. People who use the HTTP Archive data are members of the web community, scholars, and industry leaders:

- The web community uses this data to learn more about the state of the web. You may see it come up in blog posts, presentations, or social media.
- Scholars cite this data to support their [research](https://scholar.google.com/scholar?q=httparchive.org) in major publications like ACM and IEEE.
- Industry leaders use this data to calibrate their tools to accurately represent how the web is built. For example, a tool might warn a developer when their JavaScript bundle is too big, as defined by exceeding some percentile of all websites.


### How does the HTTP Archive decide which URLs to test?

The HTTP Archive crawls [~1.3 million URLs](https://httparchive.org/reports/state-of-the-web#numUrls) on both desktop and mobile twice a month. The URLs come from the Chrome User Experience Report, a monthly dataset of real user performance data of the most popular websites. Only the URLs whose domain is in the [Alexa Top 1,000,000](http://www.alexa.com/topsites) ranked list are included.


### How is the data gathered?

The list of URLs is fed to our private instance of [WebPageTest](https://webpagetest.org) on the 1st and 15th of each month.

As of March 1 2016, the tests are performed on Chrome for desktop and emulated Android (on Chrome) for mobile.

The test agents are located in the [Internet Systems Consortium](https://www.isc.org/) data center in Redwood City, CA. Each URL is loaded 3 times with an empty cache ("first view"). The data from the median run (based on load time) is collected via a [HAR file](https://en.wikipedia.org/wiki/.har). The HTTP Archive collects these HAR files, parses them, and populates our database with the relevant information. The data is also available in [BigQuery](https://bigquery.cloud.google.com/dataset/httparchive:pages).


### How accurate is the data, in particular the time measurements?

Some metrics like the number of bytes, HTTP headers, etc are accurate at the time the test was performed. It's entirely possible that the web page has changed since it was tested. The tests were performed using a single browser. If the page's content varies by browser this could be a source of differences.

The time measurements are gathered in a test environment, and thus have all the potential biases that come with that:

- browser - All tests are performed using a single browser. Page load times can vary depending on browser.
- location - The HAR files are generated from Redwood City, CA. The distance to the site's servers can affect time measurements.
- sample size - Each URL is loaded three times. The HAR file is generated from the median test run. This is not a large sample size.
- Internet connection - The connection speed, latency, and packet loss from the test location is another variable that affects time measurements.

Given these conditions it's virtually impossible to compare WebPagetest.org's time measurements with those gathered in other browsers or locations or connection speeds. They are best used as a source of comparison.


### How do I use BigQuery to write custom queries over the data?

Check out [Getting Started Accessing the HTTP Archive with BigQuery](https://github.com/HTTPArchive/httparchive/blob/master/docs/bigquery-gettingstarted.md), a guide for first-time users written by [Paul Calvano](https://twitter.com/paulcalvano).

For a guided walkthrough of the project, watch this in-depth [30 minute video](https://www.youtube.com/watch?v=00f9kza3BJ0) featuring HTTP Archive maintainer [Rick Viscomi](https://twitter.com/rick_viscomi).

If you have any questions about using BigQuery, reach out to the HTTP Archive community at [discuss.httparchive.org](https://discuss.httparchive.org/).


### What changes have been made to the test environment that might affect the data?

See [changelog.json](https://github.com/HTTPArchive/httparchive/blob/master/docs/changelog.json)


### What are the limitations of this testing methodology?

The HTTP Archive examines each URL in the list, but does not crawl the website's other pages. Although this list of websites is well known, the entire website doesn't necessarily map well to a single URL.

Most websites are comprised of many separate web pages. The landing page may not be representative of the overall site. Some websites, such as [facebook.com](http://www.facebook.com/), require logging in to see typical content. Some websites, such as [googleusercontent.com](http://www.googleusercontent.com/), don't have a landing page. Instead, they are used for hosting other URLs and resources. In this case googleusercontent.com is the domain path used for resources inserted by users into Google documents, etc. Because of these issues and more, it's possible that the actual HTML document analyzed is not representative of the website.


### What is a lens?

A lens focuses on a specific subset of websites. Through a lens, you'll see data about those particular websites only. For example, the [WordPress lens](https://wordpress.httparchive.org) focuses only on websites that are detected as being built with WordPress. We use [Wappalayzer](https://www.wappalyzer.com/) to detect over 1,000 web technologies and choose a few interesting ones to become lenses.

Lenses can be enabled  at the top of any report, or by visiting the respective subdomain, for example [`wordpress.httparchive.org`](https://wordpress.httparchive.org).


### Who sponsors the HTTP Archive?

The HTTP Archive is sponsored by companies large and small in the web industry who are dedicated to moving the web forward. Our sponsors make it possible for this non-profit project to continue operating and tracking how the web is built.

See the full list of [HTTP Archive sponsors](/about#sponsors).


### How do I make a donation to support the HTTP Archive?

The HTTP Archive is part of the Internet Archive, a 501(c)(3) non-profit. Donations in support of the HTTP Archive can be made through the Internet Archive's [donation page](https://archive.org/donate/). Make sure to send a follow-up email to [donations@archive.org](mailto:donations@archive.org?subject=HTTP+Archive+donation) designating your donation to the "HTTP Archive".


### Who maintains the HTTP Archive?

The current core maintainers are [Ilya Grigorik](https://twitter.com/igrigorik), [Pat Meenan](https://twitter.com/patmeenan), [Rick Viscomi](https://twitter.com/rick_viscomi), and [Paul Calvano](https://twitter.com/paulcalvano).

Many people have contributed ([1](https://github.com/HTTPArchive/httparchive.org/graphs/contributors), [2](https://github.com/HTTPArchive/legacy.httparchive.org/graphs/contributors)) and helped make the HTTP Archive successful over the years. Special thanks to [Steve Souders](https://twitter.com/Souders), who started the project in 2010, [Pat Meenan](https://twitter.com/patmeenan) who built the [WebPageTest](https://webpagetest.org/) infrastructure powering the HTTP Archive, and Guy Leech and Stephen Hay for design help along the way.


### Who do I contact for more information?

Please go to [Discuss HTTP Archive](https://discuss.httparchive.org/) and start a new topic.
