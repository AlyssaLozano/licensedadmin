/* Reads data/administrators.csv and renders it. There is no build step and no
   server: the whole site is this file, one stylesheet, and the CSV. */

const DATA_URL = 'data/administrators.csv';

/* Listings arrive quoting an HHSC region number, not a city, so the number can
   stand in for the grouping when no city bucket is given. Only the regions
   with a heading of their own need mapping: everything else lands in Other. */
const REGION_BY_NUMBER = { 3: 'Dallas', 6: 'Houston', 7: 'Austin', 8: 'San Antonio' };

/* Area names rather than the regional headquarters city: "Region 4" means East
   Texas, and saying "Tyler" would read as a claim about where the person is. */
const REGION_AREAS = {
  1: 'Panhandle',
  2: 'North Central',
  3: 'Dallas and Fort Worth',
  4: 'East Texas',
  5: 'Deep East Texas',
  6: 'Houston area',
  7: 'Central Texas',
  8: 'South Texas',
  9: 'West Texas',
  10: 'Far West Texas',
  11: 'Rio Grande Valley',
};

let rows = [];
let activeType = TYPES[0].key;

/* "Other" and "Undisclosed" are different facts and should not share a
   heading. East Texas is a region we know and simply has no heading; a blank is a
   person who never told us. Filing the second under "Other" implies we placed
   them somewhere, and readers stop trusting the headings. */
function regionOf(value, hhscRegion) {
  const v = (value || '').trim().toLowerCase();
  const named = REGIONS.find((r) => r.toLowerCase() === v);
  if (named) return named;

  const byNumber = REGION_BY_NUMBER[Number(hhscRegion)];
  if (byNumber) return byNumber;

  return hhscRegion ? 'Other' : 'Undisclosed';
}

function normalise(records) {
  return records
    .filter((r) => r.name)
    .map((r) => ({
      name: r.name,
      types: typesOf(r.license_type),
      region: regionOf(r.region, r.hhsc_region),
      hhscRegion: r.hhsc_region || '',
      city: r.city || '',
      organization: r.organization || '',
      phone: r.phone || '',
      email: r.email || '',
      website: r.website || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/* --- filtering ---------------------------------------------------------- */

function matches(row, term) {
  if (!term) return true;
  return [row.name, row.city, row.region, row.organization, 'region ' + row.hhscRegion]
    .join(' ')
    .toLowerCase()
    .includes(term);
}

function currentTerm() {
  return document.getElementById('search').value.trim().toLowerCase();
}

function visibleTypes() {
  return TYPES;
}

/* --- rendering ---------------------------------------------------------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function link(href, text, external) {
  const a = el('a', null, text);
  a.href = href;
  if (external) {
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
  }
  return a;
}

function contactRow(icon, node) {
  const li = el('li', 'contact-row');
  const mark = el('span', 'contact-icon', icon);
  mark.setAttribute('aria-hidden', 'true');
  li.append(mark, node);
  return li;
}

function initials(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

/* Somebody holding both licences appears under both tabs, and listing both
   credentials in each place makes the reader work out which one applies here.
   Show the licence belonging to the tab they are looking at. Everyone else's
   name is left exactly as they submitted it. */
function displayName(row, typeKey) {
  if (row.types.length < 2) return row.name;

  const type = TYPES.find((t) => t.key === typeKey);
  const base = row.name
    .replace(/,\s*(LCCA|LCPAA)\b/gi, '')
    .replace(/,\s*$/, '')
    .trim();

  return type ? base + ', ' + type.licence : base;
}

/* A wall of identical cards reads as a spreadsheet. Each person gets one of a
   few tones, picked from their name so it stays the same between visits. */
const TONES = 6;

function toneOf(name) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return 'tone-' + (hash % TONES);
}

function card(row, typeKey) {
  const li = el('li', 'card ' + toneOf(row.name));

  const head = el('div', 'card-head');
  head.append(el('span', 'avatar', initials(row.name)));

  const heading = el('div', 'card-heading');
  heading.append(el('h3', 'card-name', displayName(row, typeKey)));
  if (row.organization) heading.append(el('p', 'card-org', row.organization));

  /* Most submissions name an HHSC region rather than a city. Name the area too
     when that is all we have, since a bare region number tells a newcomer
     nothing about where the person actually is. */
  const region = row.hhscRegion ? 'Region ' + row.hhscRegion : '';
  const area = REGION_AREAS[Number(row.hhscRegion)];
  const place = row.city ? [row.city, region] : [region, area];
  const shownPlace = place.filter(Boolean).join(' · ');
  if (shownPlace) heading.append(el('p', 'card-city', shownPlace));

  head.append(heading);

  li.append(head);

  const contact = el('ul', 'contact');

  if (row.phone) {
    contact.append(contactRow('☎', link('tel:' + row.phone.replace(/[^\d+]/g, ''), row.phone)));
  }

  if (row.email) {
    contact.append(contactRow('✉', link('mailto:' + row.email, row.email)));
  }

  if (row.website) {
    const href = /^https?:\/\//i.test(row.website) ? row.website : 'https://' + row.website;
    const shown = row.website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    contact.append(contactRow('↗', link(href, shown, true)));
  }

  if (contact.childElementCount) li.append(contact);
  else li.append(el('p', 'no-contact', 'No contact details listed'));

  /* People kept emailing to ask how to change their own listing. This opens
     the form already pointed at them, so a correction arrives in one go. */
  if (!document.getElementById('signup').hidden) {
    const update = el('button', 'card-update', 'Request a change');
    update.type = 'button';
    update.setAttribute('aria-label', 'Request a change to the listing for ' + row.name);
    update.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('listing:update', { detail: { name: row.name } }));
    });
    li.append(update);
  }

  return li;
}

function regionId(region) {
  return 'region-' + region.toLowerCase().replace(/\s+/g, '-');
}

/* "Find your city" in a long tab otherwise means scrolling past every other
   city first. Only the cities with somebody in them get a chip. */
function renderJump(shown) {
  const nav = document.getElementById('jump');
  nav.replaceChildren();

  const present = REGIONS.filter((region) => shown.some((r) => r.region === region));
  nav.hidden = present.length < 2;

  present.forEach((region) => {
    const chip = el('button', 'jump-chip');
    chip.type = 'button';
    chip.append(el('span', null, region));
    chip.append(el('span', 'jump-count', String(shown.filter((r) => r.region === region).length)));
    chip.addEventListener('click', () => {
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(regionId(region)).scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
    });
    nav.append(chip);
  });
}

function renderTabs() {
  const bar = document.getElementById('tabs');
  bar.replaceChildren();

  visibleTypes().forEach((type) => {
    const selected = type.key === activeType;

    const btn = el('button', 'tab');
    btn.type = 'button';
    btn.id = 'tab-' + type.key;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(selected));
    btn.tabIndex = selected ? 0 : -1;

    /* Visitors were missing that the other list existed at all, so each tab
       says outright whether it is the one showing or one to tap. */
    const count = rows.filter((r) => r.types.includes(type.key)).length;
    btn.append(el('span', 'tab-abbr', type.abbr));
    btn.append(el('span', 'tab-label', type.label));
    btn.append(
      el('span', 'tab-hint', (selected ? 'Showing ' : 'Tap to view ') + count + ' ' + type.licence)
    );

    btn.addEventListener('click', () => select(type.key));
    bar.append(btn);
  });
}

function renderPanel() {
  const panel = document.getElementById('panel');
  const term = currentTerm();
  const shown = rows.filter((r) => r.types.includes(activeType) && matches(r, term));

  panel.replaceChildren();
  panel.setAttribute('aria-labelledby', 'tab-' + activeType);

  document.getElementById('count').textContent = rows.length
    ? shown.length === 1
      ? '1 administrator listed'
      : shown.length + ' administrators listed'
    : '';

  renderJump(shown);

  if (!shown.length) {
    panel.append(
      el(
        'p',
        'empty',
        term ? 'Nothing here matches "' + term + '".' : 'Nobody is listed here yet.'
      )
    );
    return;
  }

  REGIONS.forEach((region) => {
    const inRegion = shown.filter((r) => r.region === region);
    if (!inRegion.length) return;

    const section = el('section', 'region');
    section.id = regionId(region);

    const heading = el('h2', 'region-name');
    heading.append(el('span', 'region-text', region));
    heading.append(el('span', 'region-count', String(inRegion.length)));
    section.append(heading);

    const list = el('ul', 'cards');
    inRegion.forEach((r) => list.append(card(r, activeType)));
    section.append(list);

    panel.append(section);
  });
}

function select(key) {
  activeType = key;
  history.replaceState(null, '', '#' + key.toLowerCase());
  renderTabs();
  renderPanel();
}

/* Left and right arrows move between tabs, which is what a screen reader user
   expects from a tablist. */
function wireTabKeys() {
  document.getElementById('tabs').addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();

    const keys = visibleTypes().map((t) => t.key);
    const next = keys[(keys.indexOf(activeType) + step + keys.length) % keys.length];

    select(next);
    document.getElementById('tab-' + next).focus();
  });
}

function showNotice(message) {
  const box = document.getElementById('notice');
  box.textContent = message;
  box.hidden = false;
}

/* --- boot --------------------------------------------------------------- */

async function start() {
  wireTabKeys();
  document.getElementById('search').addEventListener('input', renderPanel);

  let updated = null;

  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    rows = normalise(toRecords(parseCsv(await res.text())));
    /* GitHub Pages stamps every file with the time of the last publish, which
       is close enough to "last edited" for a list that only changes by push. */
    const stamp = new Date(res.headers.get('Last-Modified'));
    if (!isNaN(stamp)) updated = stamp;
  } catch (err) {
    showNotice(
      location.protocol === 'file:'
        ? 'Opening this file directly will not load the list. Use the published site, or run a local server.'
        : 'The list could not be loaded. ' + err.message
    );
    renderTabs();
    return;
  }

  if (rows.some((r) => /\(example\)/i.test(r.name))) {
    showNotice('This is sample data. Replace the rows in data/administrators.csv with real listings.');
  }

  /* With no third tab to catch them, a row whose licence type is missing or
     misspelled belongs to no tab at all. Say so rather than letting somebody
     drop off the page in silence. */
  const unplaced = rows.filter((r) => !r.types.length);
  if (unplaced.length) {
    showNotice(
      'Not listed for want of a licence type: ' +
        unplaced.map((r) => r.name).join(', ') +
        '. Add LCCA or LCPAA to those rows in data/administrators.csv.'
    );
  }

  /* GRO opens first by design, but opening on an empty tab reads as a
     broken site. Fall through to the first tab that actually has somebody. */
  if (!rows.some((r) => r.types.includes(activeType))) {
    const populated = visibleTypes().find((t) => rows.some((r) => r.types.includes(t.key)));
    if (populated) activeType = populated.key;
  }

  /* An explicit link wins over that, so a shared #cpa still lands on CPA. */
  const fromUrl = location.hash.replace('#', '').toUpperCase();
  if (TYPES.some((t) => t.key === fromUrl)) activeType = fromUrl;

  const regions = new Set(rows.map((r) => r.hhscRegion).filter(Boolean));
  const stats = document.getElementById('stats');
  let summary = rows.length + ' administrators listed across ' + regions.size + ' HHSC regions';
  if (updated) {
    summary +=
      ' · Updated ' +
      updated.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Chicago',
      });
  }
  stats.textContent = summary;
  stats.hidden = false;

  renderTabs();
  renderPanel();
}

start();
