# beta
Beta version of https://github.com/HTTPArchive/httparchive at https://beta.httparchive.org

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
