/* Reads data/administrators.csv and renders it. There is no build step and no
   server: the whole site is this file, one stylesheet, and the CSV. */

const DATA_URL = 'data/administrators.csv';

/* Tab order is fixed. A type outside this list still shows, under "Other", so a
   typo in the CSV never silently hides somebody. */
const TYPES = [
  {
    key: 'CPA',
    label: 'Child Placing Agency',
    abbr: 'CPA',
    /* A CPA administrator's licence reads LCPAA, so people submit that rather
       than the operation type. Accept both. */
    aliases: ['cpa', 'lcpaa', 'child placing agency', 'child-placing agency', 'child placement agency'],
  },
  {
    key: 'GRO',
    label: 'General Residential Operation',
    abbr: 'GRO',
    aliases: ['gro', 'lcca', 'general residential operation'],
  },
  { key: 'OTHER', label: 'Undisclosed', abbr: '', aliases: [] },
];

/* Cities group within a tab. Anything unrecognised falls to "Other" rather than
   creating a new heading, so the page shape stays predictable. */
const REGIONS = ['Houston', 'Dallas', 'Austin', 'Other', 'Undisclosed'];

/* Listings arrive quoting an HHSC region number, not a city, so the number can
   stand in for the grouping when no city bucket is given. Only the three that
   have their own tab need mapping: everything else lands in Other anyway. */
const REGION_BY_NUMBER = { 3: 'Dallas', 6: 'Houston', 7: 'Austin' };

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

/* --- CSV ---------------------------------------------------------------- */

/* Handles quoted fields, escaped quotes, and commas or newlines inside a field,
   because Excel writes all three the moment a name contains a comma. */
function parseCsv(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const table = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];

    if (quoted) {
      if (c !== '"') {
        field += c;
      } else if (clean[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      table.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  row.push(field);
  table.push(row);

  return table.filter((r) => r.some((v) => v.trim() !== ''));
}

function toRecords(table) {
  if (!table.length) return [];
  const headers = table[0].map((h) => h.trim().toLowerCase());

  return table.slice(1).map((cells) => {
    const record = {};
    headers.forEach((h, i) => {
      record[h] = (cells[i] || '').trim();
    });
    return record;
  });
}

/* Plenty of administrators hold both licences, so a row can name more than one
   and the person then appears under both tabs. One row per person keeps a
   correction from having to be made twice. */
function typesOf(value) {
  const parts = (value || '')
    .split(/[;/,]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const keys = parts.map((v) => {
    const hit = TYPES.find((t) => t.aliases.includes(v));
    return hit ? hit.key : 'OTHER';
  });

  return [...new Set(keys.length ? keys : ['OTHER'])];
}

/* "Other" and "Undisclosed" are different facts and should not share a
   heading. San Antonio is a region we know and simply has no tab; a blank is a
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
  /* "Other" earns a tab only when something actually lands in it. */
  return TYPES.filter((t) => t.key !== 'OTHER' || rows.some((r) => r.types.includes('OTHER')));
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

function card(row) {
  const li = el('li', 'card');

  const head = el('div', 'card-head');
  head.append(el('span', 'avatar', initials(row.name)));

  const heading = el('div', 'card-heading');
  heading.append(el('h3', 'card-name', row.name));
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

  return li;
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

    btn.append(el('span', 'tab-label', type.label));
    if (type.abbr) btn.append(el('span', 'tab-abbr', type.abbr));

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

    const heading = el('h2', 'region-name');
    heading.append(el('span', 'region-text', region));
    heading.append(el('span', 'region-count', String(inRegion.length)));
    section.append(heading);

    const list = el('ul', 'cards');
    inRegion.forEach((r) => list.append(card(r)));
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

  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    rows = normalise(toRecords(parseCsv(await res.text())));
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

  /* Tab order is CPA first by design, but opening on an empty tab reads as a
     broken site. Fall through to the first tab that actually has somebody. */
  if (!rows.some((r) => r.types.includes(activeType))) {
    const populated = visibleTypes().find((t) => rows.some((r) => r.types.includes(t.key)));
    if (populated) activeType = populated.key;
  }

  /* An explicit link wins over that, so a shared #cpa still lands on CPA. */
  const fromUrl = location.hash.replace('#', '').toUpperCase();
  if (TYPES.some((t) => t.key === fromUrl)) activeType = fromUrl;

  renderTabs();
  renderPanel();
}

start();
