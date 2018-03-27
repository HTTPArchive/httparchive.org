# HTTPArchive.org
New and improved version of [HTTP Archive](https://httparchive.org). This replaces the [legacy version](https://legacy.httparchive.org), the source code for which is still available at [HTTPArchive/legacy.httparchive.org](https://github.com/HTTPArchive/legacy.httparchive.org).

## Run Locally

[Source](https://cloud.google.com/appengine/docs/flexible/python/quickstart)

1. If you don't have virtualenv, install it using pip.

```
sudo pip install virtualenv
```

2. Create an isolated Python environment, and install dependencies:

```
virtualenv env
source env/bin/activate
pip install -r requirements.txt
```

3. Install the NPM dependencies:

```
npm install
```

4. Run the application:

```
npm run start
```

4. In your web browser, enter the following address: http://localhost:8080

## Deploy

```
npm run deploy
```
