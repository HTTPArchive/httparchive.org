# HTTPArchive.org Web Server on App Engine
New and improved version of [HTTP Archive](https://httparchive.org). This replaces the [legacy version](https://legacy.httparchive.org), the source code for which is still available at [HTTPArchive/legacy.httparchive.org](https://github.com/HTTPArchive/legacy.httparchive.org).

## Run Locally

[Source](https://cloud.google.com/appengine/docs/flexible/python/quickstart)

1. If you don't have virtualenv, install it using pip.

```
sudo pip install virtualenv
```

2. Create an isolated Python environment, and install dependencies:

```
virtualenv --python python3.12 .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Install the NPM dependencies:

```
npm install
```

4. Initialize the Google Cloud CLI (this is necessary because the App Engine server uses Google Cloud APIs):

```
gcloud init
```

5. Run the application:

```
npm run start
```

Note: Windows users may need to run `npm run watch` and `python main.py` separately.

6. In your web browser, enter the following address: http://127.0.0.1:8080

## Staging

To test changes on a GCP App Engine server without deploying to the production instance, use the staging app at https://httparchive-staging.appspot.com.

```
npm run stage
```

## Deploy

To push changes live to the production instance, use the deployment script. Changes will be available on https://httparchive.org.

```
npm run deploy
```

## Added new icons

We use [Font Awesome](https://fontawesome.com/) icons but inline them directly in the code to save using the JavaScript library. To add, or change an icon, [find one on the Font Awesome website](https://fontawesome.com/icons) and copy the path from the SVG tab and reference it by name in the [reports.json](/config/reports.json) and add the SVG path in the [reports.html](/templates/reports.html) file as per the others. The width in the `reports.json` can be set based on display preferences.

## Third-party software licenses

HTTP Archive uses Highcharts. See their [licensing terms](https://shop.highcharts.com/) for more info.
HTTP Archive uses Font Awesome. See their [licensing terms](https://github.com/FortAwesome/Font-Awesome#license) for more info.
