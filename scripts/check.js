/* Checks data/administrators.csv before it goes live. Every rule here is a
   mistake that has already reached the list once, caught by hand: a phone
   pasted as raw digits, a misspelled licence, an email domain one letter off.
   Run with `npm run check`; it exits non-zero when anything needs fixing. */

const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns').promises;
const { TYPES, REGIONS, parseCsv, toRecords } = require('../assets/data.js');

const FILE = path.join(__dirname, '..', 'data', 'administrators.csv');
const HEADER = 'name,license_type,hhsc_region,region,city,organization,phone,email,website';

const problems = [];
const warnings = [];

function problem(line, name, message) {
  problems.push(`line ${line}${name ? ' (' + name + ')' : ''}: ${message}`);
}

function warning(line, name, message) {
  warnings.push(`line ${line}${name ? ' (' + name + ')' : ''}: ${message}`);
}

/* Credentials vary between submissions from the same person ("Kara D. Wilson"
   then "Kara D. Wilson, LCPAA"), so compare names with them stripped. */
function bareName(name) {
  return name.split(',')[0].replace(/\s+/g, ' ').trim().toLowerCase();
}

/* A domain that cannot receive mail is a listing nobody can write to. Fall
   back to an address record, since a domain with no MX still takes mail on its
   A record. A lookup that fails for network reasons is a warning, not a
   verdict, so an offline run does not cry wolf. */
async function domainProblem(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length) return null;
  } catch (err) {
    if (!['ENOTFOUND', 'ENODATA', 'ENOTIMP'].includes(err.code)) return 'unchecked';
  }
  try {
    await dns.resolve4(domain);
    return null;
  } catch (err) {
    return ['ENOTFOUND', 'ENODATA'].includes(err.code) ? 'no mail' : 'unchecked';
  }
}

async function main() {
  const text = fs.readFileSync(FILE, 'utf8');
  const table = parseCsv(text);

  if (table[0].join(',') !== HEADER) {
    problem(1, null, 'the header row has changed. It must read exactly: ' + HEADER);
  }

  const records = toRecords(table);
  const aliases = new Set(TYPES.flatMap((t) => t.aliases));
  const headings = new Set(REGIONS.map((r) => r.toLowerCase()));
  const seen = { name: new Map(), email: new Map(), phone: new Map() };
  const domains = new Map();

  records.forEach((r, i) => {
    const line = i + 2;
    const name = r.name;

    if (table[i + 1].length !== 9) {
      problem(line, name, `has ${table[i + 1].length} columns, not 9. A comma inside a value probably needs quotes.`);
    }

    if (!name) {
      problem(line, null, 'has no name, so the page will skip it');
      return;
    }

    /* A blank licence is the owner's instruction for LCCA. Anything written
       that the page does not recognise is a typo, and the page would drop it. */
    const words = r.license_type.split(/[;/,]/).map((v) => v.trim().toLowerCase()).filter(Boolean);
    const unknown = words.filter((w) => !aliases.has(w));
    if (unknown.length) {
      problem(line, name, `licence "${r.license_type}" is not LCCA or LCPAA, so they would not appear on either tab`);
    }

    if (r.hhsc_region && !/^(?:[1-9]|1[01])$/.test(r.hhsc_region)) {
      problem(line, name, `HHSC region "${r.hhsc_region}" is not a number from 1 to 11`);
    }

    if (r.region && !headings.has(r.region.toLowerCase())) {
      problem(line, name, `region "${r.region}" is not a heading. Use one of ${REGIONS.join(', ')}, or leave it blank.`);
    }

    if (r.phone && !/^\(\d{3}\) \d{3}-\d{4}$/.test(r.phone)) {
      problem(line, name, `phone "${r.phone}" should look like (832) 555-0100`);
    }

    if (r.email) {
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(r.email)) {
        problem(line, name, `email "${r.email}" does not look like an email address`);
      } else {
        const domain = r.email.split('@')[1].toLowerCase();
        if (!domains.has(domain)) domains.set(domain, []);
        domains.get(domain).push({ line, name });
      }
    }

    if (r.website && /[?&](utm_|fbclid|gclid)/i.test(r.website)) {
      warning(line, name, 'website carries tracking codes from a share button. Trim everything from the "?".');
    }

    const keys = {
      name: bareName(name),
      email: r.email.toLowerCase(),
      phone: r.phone.replace(/\D/g, ''),
    };
    for (const [kind, key] of Object.entries(keys)) {
      if (!key) continue;
      const earlier = seen[kind].get(key);
      if (earlier) {
        problem(line, name, `same ${kind} as line ${earlier}. One row per person; use "LCCA; LCPAA" for both licences.`);
      } else {
        seen[kind].set(key, line);
      }
    }
  });

  const results = await Promise.all(
    [...domains.keys()].map(async (d) => [d, await domainProblem(d)])
  );
  for (const [domain, result] of results) {
    for (const { line, name } of domains.get(domain)) {
      if (result === 'no mail') {
        problem(line, name, `email domain "${domain}" does not exist or cannot receive mail. Check the spelling.`);
      } else if (result === 'unchecked') {
        warning(line, name, `could not look up "${domain}". Check the connection and run again.`);
      }
    }
  }

  for (const w of warnings) console.log('warning  ' + w);
  for (const p of problems) console.log('PROBLEM  ' + p);

  if (problems.length) {
    console.log(`\n${problems.length} problem(s) in ${records.length} rows. Fix these before pushing.`);
    process.exit(1);
  }
  console.log(`All ${records.length} rows look right.`);
}

main();
