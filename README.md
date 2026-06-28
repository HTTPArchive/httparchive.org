# HTTPArchive.org Web Server on App Engine

New and improved version of [HTTP Archive](https://httparchive.org). This replaces the [legacy version](https://legacy.httparchive.org), the source code for which is still available at [HTTPArchive/legacy.httparchive.org](https://github.com/HTTPArchive/legacy.httparchive.org).

## Run Locally

This is an Astro and Node.js-based application (Express server). It requires **Node.js >= 24.0.0**.

1. Install the NPM dependencies:

    ```bash
    npm install
    ```

2. Initialize the Google Cloud CLI (this is necessary because the web server uses Google Cloud APIs like Google Cloud Storage to fetch reports):

    ```bash
    gcloud init
    ```

3. Run the application:

    * **Production build and start:**

    ```bash
    npm run start
    ```

    * **Development mode (with live reload):**

    ```bash
    npm run watch
    ```

4. In your web browser, enter the following address: http://127.0.0.1:8080

## Linting

To run the GitHub Super-Linter locally using Docker:

* **macOS / Linux:**

  ```bash
  npm run lint:darwin:linux
  ```

* **Windows (Command Prompt):**

  ```bash
  npm run lint:win32
  ```

## Staging

(Only available to maintainers)

To test changes on a GCP App Engine server without deploying to the production instance, use the staging app at https://staging-dot-httparchive.uk.r.appspot.com/

```bash
npm run stage
```

## Deploy

(Only available to maintainers)

To push changes live to the production instance, use the deployment script. Changes will be available on https://httparchive.org.

```bash
npm run deploy
```

## Added new icons

We use [Font Awesome](https://fontawesome.com/) icons but inline them directly in the code to save using the JavaScript library. To add, or change an icon, [find one on the Font Awesome website](https://fontawesome.com/icons) and copy the path from the SVG tab and reference it by name in the [reports.json](/config/reports.json) and add the SVG path in the [reports.html](/templates/reports.html) file as per the others. The width in the `reports.json` can be set based on display preferences.

## Third-party software licenses

HTTP Archive uses Highcharts. See their [licensing terms](https://shop.highcharts.com/) for more info.
HTTP Archive uses Font Awesome. See their [licensing terms](https://github.com/FortAwesome/Font-Awesome#license) for more info.
