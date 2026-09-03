# Updating the list

Everything on the site comes from one file: `data/administrators.csv`. There is
no database and no login. Edit that file, save, push, and the site updates.

## The columns

| Column | Required | What it does |
| --- | --- | --- |
| `name` | yes | The administrator's name and credentials. Rows with no name are skipped. |
| `license_type` | yes | `LCCA` for GRO, `LCPAA` for CPA. This picks the tab. |
| `hhsc_region` | no | The HHSC region number, 1 to 11. Shown on the card, and used to pick the city heading when `region` is blank. |
| `region` | no | `Houston`, `Dallas`, `Austin`, or `Other`. Overrides whatever the region number would have chosen. |
| `city` | no | The actual city. Round Rock sits under the Austin heading, for example. |
| `organization` | no | Their agency or company. |
| `phone` | no | Shown as a tap-to-call link. |
| `email` | no | Shown as a mailto link. |
| `website` | no | With or without `https://`, either works. |

### Somebody who holds both licences

Put both in `license_type`, separated by a semicolon, and they appear under both
tabs from the one row:

```
"Alyssa Lozano, MS, MPA","LCCA; LCPAA",...
```

One row per person means a correction only has to be made once.

Leave a cell empty when you do not have it. The card only shows the lines it
actually has, so a blank never leaves a gap on the page.

There are only two tabs, CPA and GRO. "Other" is a region heading inside a tab,
for a region that is known but does not have a tab of its own, such as San
Antonio or East Texas. A blank region gets "Undisclosed" instead, so the two
are never confused.

A row whose `license_type` is blank or misspelled belongs to neither tab. Rather
than dropping that person quietly, the page prints a notice at the top naming
them, so a typo shows up as a message to fix rather than a person who vanished.

## Editing it

**In Excel or Google Sheets.** Open `data/administrators.csv`, edit, save as
CSV. Keep the header row exactly as it is. Commas and apostrophes inside a name
are fine, the site handles quoted fields.

**In a text editor.** Wrap any value containing a comma in double quotes.

## Publishing a change

```bash
git add data/administrators.csv
git commit -m "Update the administrator list"
git push
```

GitHub Pages redeploys within about a minute.

## Previewing before you push

```bash
npm run serve
```

Then open http://localhost:4173. Opening `index.html` by double-clicking will
not work: browsers refuse to read the CSV from a `file://` page, and the site
will tell you so.

## A note on contact details

Phone numbers and email addresses on a public page get scraped. Only publish
details a person has agreed to have listed publicly, and use a business number
rather than a personal one where you can.
