# Working in this repository

A public directory of licensed administrators in Texas, live at
licensedadmin.com. Static site on GitHub Pages: no database, no server, no build
step. Read `README.md` for the shape and `docs/updating.md` for the data format.

## The usual request

Almost every request here is "add this person". The whole job is one line
appended to `data/administrators.csv`, then commit and push. GitHub Pages
redeploys in about a minute.

Submissions arrive pasted from a group chat and are messy on purpose. Expect a
name, sometimes a licence, sometimes a region number, sometimes just a city.

## The columns

`name,license_type,hhsc_region,region,city,organization,phone,email,website`

- **name**: as they gave it, with their credentials, e.g. `Shola Lawal, LCCA`
- **license_type**: `LCCA` or `LCPAA`. Both, semicolon separated, puts one person
  under both tabs from one row. **Blank means LCCA**, since nearly everyone here
  is one.
- **hhsc_region**: the HHSC region number, 1 to 11
- **region**: only to override the tab grouping. Usually blank.
- **phone**: format as `(832) 555-0100`

Quote any value containing a comma.

## Non-negotiables

**There are two tabs and only two: CPA and GRO.** "Other" is a region heading
*inside* a tab, for a region that is known but has no tab of its own, such as
San Antonio. Do not add a third tab.

**"Other" and "Undisclosed" are different facts.** Other means we know the
region and it has no tab. Undisclosed means the person never said. Filing the
second under the first claims a placement nobody made.

**Never guess somebody's licence from context.** A blank defaults to LCCA by the
owner's instruction, but a *misspelled* licence stays unplaced and raises the
notice, because a typo means somebody meant something specific. Publishing a
licence claim nobody made is the one error worth avoiding here.

**Never infer a region from an area code.** Vanessa Lopez gave Region 3 with a
915 number, and her stated region is what stands. Ask instead.

**Verify an email domain before publishing it.** One submission arrived as
`thematernitygome.org` when the organisation's domain is `thematernityhome.org`.
A directory entry nobody can write to is worse than no entry.

## Conventions

- Real people's contact details. Only publish what somebody submitted for this
  purpose, and never add a person who did not ask to be listed.
- All simulated or example addresses use `example.com`, never a real domain.
- Commit and push without asking. Say what changed and why, not what the diff
  already shows.
- Comments explain *why*, not *what*. The existing files set the density.
- No em dashes anywhere, in code comments, commits, or on the page.

## Checking your work

```bash
npm run serve
```

Then load http://localhost:4173. Opening `index.html` directly will not work:
the browser refuses to read the CSV from a `file://` page.
