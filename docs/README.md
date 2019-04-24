# HTTP Archive Documentation

## Changelog

The `changelog.json` file chronicles significant changes to the test environment that may affect the data.

* `date`: the Unix timestamp of the event date (at midnight)
* `title`: brief description of the event
* `desc`: full description of the event
* `more`: (optional) array of objects with keys/values representing anchor text/URLs

Use the `more` property when a change has additional info to be displayed in a "See also" type of UX.

Use [this helper script](https://gist.github.com/rviscomi/0ed73516c2022a80167c09216b9f8f9a) to append events to the changelog:

```js
class HAChangelog {
    constructor(changelog=[]) {
        this.changelog = changelog;
    }

    add(datestr, title, desc) {
        this.changelog.push({
            date: (new Date(datestr)).getTime(),
            title,
            desc
        });
        return this.changelog;
    }

    sort() {
        this.changelog = this.changelog.sort((a, b) => {
            return a.date - b.date;
        });
    }

    toJSON() {
        this.sort();
        return JSON.stringify(this.changelog, null, 4);
    }
}
```

Example usage:

```js
// Instantiate a new object with existing changelog data.
cl = new HAChangelog([{
    "date": 1331784000000,
    "title": "Change agents from IE 8 to IE 9",
    "desc": "Switch from IE 8 to IE 9."
}]);

// Add a new event. The date can be entered in human-readable format for convenience.
cl.add("May 1, 2012", "Increase number of URLs", "The number of URLs tested increased from 100K to 200K for IE.");

// Copy this output and paste into changelog.json.
cl.toJSON();
```
