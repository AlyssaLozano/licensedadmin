# Licensed Admin

A public directory of licensed administrators in Texas, so the people who need
one have a single place to look.

Its own product, its own repository. Not part of Compass Cabinet
(`AlyssaLozano/compass-cabinet`): the two share a problem domain but not a
codebase, a database, or a release cycle.

## How it works

There is no database and no server. The site is three files plus a spreadsheet:

```
index.html            the page
assets/styles.css     the look
assets/app.js         reads the CSV, builds the tabs and cards
data/administrators.csv   the entire contents of the site
```

Tabs are the type of operation, Child Placing Agency (CPA) and General
Residential Operation (GRO). Inside each tab, listings group by city: Houston,
Dallas, Austin, Other.

To add or change a listing, edit `data/administrators.csv` and push. See
[docs/updating.md](docs/updating.md).

A database was considered and rejected. It would need a server, a login,
and backups, all so one person can edit one list.

## Local preview

```bash
npm run serve
```

http://localhost:4173. A local server is needed only for previewing, because a
browser will not read the CSV from a `file://` page. The published site needs
nothing.
