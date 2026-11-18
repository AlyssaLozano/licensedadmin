/* What the page and scripts/check.js both need to agree on: how the CSV is
   read, which licence words are accepted, and which headings exist. Kept in one
   place so the check can never pass a row the page would misplace. */

/* These two are the only tabs. "Other" is a region heading inside a tab, never
   a tab of its own. GRO comes first because nearly everyone listed is an LCCA,
   so most visitors land on the list they came for. */
const TYPES = [
  {
    key: 'GRO',
    label: 'General Residential Operation',
    abbr: 'GRO',
    licence: 'LCCA',
    aliases: ['gro', 'lcca', 'general residential operation'],
  },
  {
    key: 'CPA',
    label: 'Child Placing Agency',
    abbr: 'CPA',
    licence: 'LCPAA',
    /* A CPA administrator's licence reads LCPAA, so people submit that rather
       than the operation type. Accept both. */
    aliases: ['cpa', 'lcpaa', 'child placing agency', 'child-placing agency', 'child placement agency'],
  },
];

/* Cities group within a tab. Anything unrecognised falls to "Other" rather than
   creating a new heading, so the page shape stays predictable. */
const REGIONS = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Other', 'Undisclosed'];

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

  /* Nearly everybody on this list is an LCCA, so a row nobody has filled in yet
     defaults to GRO. A misspelled licence is left unplaced on purpose: a blank
     means the field is outstanding, a typo means somebody meant something
     specific and it did not land, and quietly turning that into LCCA would
     publish a claim about their licence that nobody made. */
  if (!parts.length) return ['GRO'];

  const keys = parts
    .map((v) => TYPES.find((t) => t.aliases.includes(v)))
    .filter(Boolean)
    .map((t) => t.key);

  return [...new Set(keys)];
}

/* The page loads this as a plain script; the check script requires it. */
if (typeof module !== 'undefined') {
  module.exports = { TYPES, REGIONS, parseCsv, toRecords, typesOf };
}
