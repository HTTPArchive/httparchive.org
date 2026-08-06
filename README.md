# HTTPArchive.org Website

## Run Locally

This is an Astro-based web application for HTTPArchive.org. It requires **Node.js >= 24.0.0**.

1. Install the NPM dependencies:

    ```bash
    npm install
    ```

2. Run the application:

    * **Development mode (with live reload):**

    ```bash
    npm run astro:dev
    ```

    In your web browser, open [http://localhost:4321](http://localhost:4321)

    * **Production build:**

    ```bash
    npm run build
    ```

    * **Build & run locally in Firebase Hosting emulator:**

    ```bash
    npm run start
    ```

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

To deploy and test changes on the Firebase Hosting staging channel:

```bash
npm run stage
```

## Deploy

(Only available to maintainers)

To push changes live to Firebase Hosting production instance:

```bash
npm run deploy
```

## Adding New Icons

We use [Font Awesome](https://fontawesome.com/) icons but inline them directly in the SVG sprite to avoid using the JavaScript library. To add or change an icon, find one on the [Font Awesome website](https://fontawesome.com/icons), copy the path from the SVG tab, reference it by name in [`config/reports.json`](/config/reports.json), and add the SVG `<symbol>` path in [`src/pages/reports/index.astro`](/src/pages/reports/index.astro).

## Third-party software licenses

HTTP Archive uses Highcharts. See their [licensing terms](https://shop.highcharts.com/) for more info.
HTTP Archive uses Font Awesome. See their [licensing terms](https://github.com/FortAwesome/Font-Awesome#license) for more info.
