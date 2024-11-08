## What does the HTTP Archive do?

**The HTTP Archive tracks how the web is built.** It provides historical data to quantitatively illustrate how the web is evolving. People who use the HTTP Archive data are members of the web community, scholars, and industry leaders:

- The web community uses this data to learn more about the state of the web. You may see it come up in blog posts, presentations, or social media.
- Scholars cite this data to support their [research](https://scholar.google.com/scholar?q=httparchive.org) in major publications like ACM and IEEE.
- Industry leaders use this data to calibrate their tools to accurately represent how the web is built. For example, a tool might warn a developer when their JavaScript bundle is too big, as defined by exceeding some percentile of all websites.


## How does the HTTP Archive decide which URLs to test?

The HTTP Archive crawls [millions of URLs](https://httparchive.org/reports/state-of-the-web#numUrls) on both desktop and mobile monthly. The URLs come from the [Chrome User Experience Report](https://web.dev/fast/chrome-ux-report), a dataset of real user performance data of the most popular websites.


## How is the data gathered?

The list of URLs is fed to our private instance of [WebPageTest](https://webpagetest.org) on the 1st of each month.

As of March 1 2016, the tests are performed on Chrome for desktop and emulated Android (on Chrome) for mobile.

The test agents are run from [Google Cloud regions](https://cloud.google.com/compute/docs/regions-zones) across the US. Each URL is loaded once with an empty cache ("first view") for normal metrics collection and again, in a clean browser profile, using [Lighthouse](https://developers.google.com/web/tools/lighthouse). The data is collected via a [HAR file](https://en.wikipedia.org/wiki/.har). The HTTP Archive collects these HAR files, parses them, and populates various tables in BigQuery.

## How accurate is the data, in particular the time measurements?

Some metrics like the number of bytes, HTTP headers, etc are accurate at the time the test was performed. It's entirely possible that the web page has changed since it was tested. The tests were performed using a single browser. If the page's content varies by browser this could be a source of differences.

The time measurements are gathered in a test environment, and thus have all the potential biases that come with that:

- **Browser** - All tests are performed using a single browser. Page load times can vary depending on browser.
- **Location** - The HAR files are generated from various datacenters in the US. The distance to the site's servers can affect time measurements.
- **Sample size** - Each URL is loaded only once.
- **Internet connection** - The connection speed, latency, and packet loss from the test location is another variable that affects time measurements.

Given these conditions it's virtually impossible to compare the HTTP Archive's time measurements with those gathered in other browsers, locations or connection speeds. They are best used as a source of comparison only within the HTTP Archive dataset.


## How do I use BigQuery to write custom queries over the data?

The HTTP Archive dataset is available on BigQuery. Be aware that as a consequence of collecting so much metadata from millions of websites each month, the dataset is _extremely large_—multiple petabytes. Care _must_ be taken to set up [cost controls](https://cloud.google.com/bigquery/docs/custom-quotas) to avoid unexpected bills. Also see our guide to [minimizing query costs](https://har.fyi/guides/minimizing-costs/) for tips on staying under the 1 TB per month free quota.

Check out [Getting Started Accessing the HTTP Archive with BigQuery]([https://github.com/HTTPArchive/httparchive.org/blob/main/docs/gettingstarted_bigquery.md](https://har.fyi/guides/getting-started/)), a guide for first-time users written by [Paul Calvano](https://twitter.com/paulcalvano).

For a guided walkthrough of the project, watch this in-depth [30 minute video](https://www.youtube.com/watch?v=00f9kza3BJ0) featuring HTTP Archive maintainer [Rick Viscomi](https://twitter.com/rick_viscomi).

If you have any questions about using BigQuery, reach out to the HTTP Archive community at [discuss.httparchive.org](https://discuss.httparchive.org/).


## What changes have been made to the test environment that might affect the data?

See [changelog.json](https://github.com/HTTPArchive/httparchive/blob/main/docs/changelog.json)


## What are the limitations of this testing methodology?

The HTTP Archive examines each URL in the list, but does not crawl the website's other pages. Although this list of websites is well known, the entire website doesn't necessarily map well to a single URL.

Most websites are comprised of many separate web pages. The landing page may not be representative of the overall site. Some websites, such as [facebook.com](http://www.facebook.com/), require logging in to see typical content. Some websites, such as [googleusercontent.com](http://www.googleusercontent.com/), don't have a landing page. Instead, they are used for hosting other URLs and resources. In this case googleusercontent.com is the domain path used for resources inserted by users into Google documents, etc. Because of these issues and more, it's possible that the actual HTML document analyzed is not representative of the website.


## What is a lens?

A lens focuses on a specific subset of websites. Through a lens, you'll see data about those particular websites only. For example, the [WordPress lens](https://wordpress.httparchive.org) focuses only on websites that are detected as being built with WordPress. We use [Wappalayzer](https://www.wappalyzer.com/) to detect over 1,000 web technologies and choose a few interesting ones to become lenses.

Lenses can be enabled  at the top of any report, or by visiting the respective subdomain, for example [`wordpress.httparchive.org`](https://wordpress.httparchive.org).


## Who sponsors the HTTP Archive?

The HTTP Archive is sponsored by companies large and small in the web industry who are dedicated to moving the web forward. Our sponsors make it possible for this non-profit project to continue operating and tracking how the web is built.

See the full list of [HTTP Archive sponsors](/about#sponsors).


## How do I make a donation to support the HTTP Archive?

Donations in support of the HTTP Archive can be made through the [Open Collective](https://opencollective.com/httparchive).


## Who maintains the HTTP Archive?

The current core maintainers are [Pat Meenan](https://x.com/patmeenan), [Rick Viscomi](https://x.com/rick_viscomi), [Paul Calvano](https://x.com/paulcalvano), [Barry Pollard](https://x.com/tunetheweb), and [Max Ostapenko](https://x.com/themax_o).

Many people have contributed ([1](https://github.com/HTTPArchive/httparchive.org/graphs/contributors), [2](https://github.com/HTTPArchive/legacy.httparchive.org/graphs/contributors)) and helped make the HTTP Archive successful over the years. Special thanks to [Steve Souders](https://x.com/Souders), who started the project in 2010, [Pat Meenan](https://x.com/patmeenan) who built the [WebPageTest](https://webpagetest.org/) infrastructure powering the HTTP Archive, [Ilya Grigorik](https://x.com/igrigorik), a long-time core maintainer, and Guy Leech and Stephen Hay for design help along the way.


## Who do I contact for more information?

Please go to [Discuss HTTP Archive](https://discuss.httparchive.org/) and start a new topic.
