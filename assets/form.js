/* The "get listed" form. The site is static, so the submission goes to a form
   service that emails it on. Set FORM_ENDPOINT to switch the form on: until it
   has one, the whole section stays hidden rather than shipping a button that
   quietly does nothing. */

const FORM_ENDPOINT = 'https://formspree.io/f/myeyjdkw';

const section = document.getElementById('signup');
const form = document.getElementById('signup-form');
const status = document.getElementById('f-status');
const submit = document.getElementById('f-submit');

const title = document.getElementById('signup-title');
const copy = document.getElementById('signup-copy');
const switcher = document.getElementById('signup-switch');
const request = document.getElementById('f-request');
const changeField = document.getElementById('f-change-field');
const change = document.getElementById('f-change');
const nameInput = document.getElementById('f-name');
const email = document.getElementById('f-email');
const emailHint = document.getElementById('f-email-hint');
const phone = document.getElementById('f-phone');

const NEW_TITLE = title.textContent;
const NEW_COPY = copy.textContent;
const NEW_SUBMIT = submit.textContent;

function say(message, kind) {
  status.textContent = message;
  status.className = 'form-status' + (kind ? ' is-' + kind : '');
}

/* --- new listing or a change ------------------------------------------- */

/* The same form handles both, so a correction arrives with the same fields
   and consent as a new listing. The request field and subject line tell the
   two apart in the inbox. */
function setMode(updating, name) {
  request.value = updating ? 'Change to an existing listing' : 'New listing';
  title.textContent = updating ? 'Request a change to a listing' : NEW_TITLE;
  copy.textContent = updating
    ? 'Say what should change and confirm the details below. It goes to the person who maintains the directory, and the listing is updated by hand.'
    : NEW_COPY;
  submit.textContent = updating ? 'Send this change' : NEW_SUBMIT;
  switcher.hidden = !updating;
  changeField.hidden = !updating;
  change.required = updating;
  if (updating) nameInput.value = name;
}

document.addEventListener('listing:update', (event) => {
  setMode(true, event.detail.name);
  say('');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  change.focus({ preventScroll: true });
});

document.getElementById('f-new').addEventListener('click', () => {
  form.reset();
  setMode(false);
  nameInput.focus();
});

/* --- tidying what people type ------------------------------------------ */

/* Numbers arrive as 8325550100 or 18325550100. Show them the way the list
   prints them, so what they send is what gets published. Anything that is
   not a plain US number is left exactly as typed. */
function formatPhone() {
  let digits = phone.value.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
  if (digits.length === 10) {
    phone.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
}

/* A one-letter slip in the domain makes a listing nobody can write to, and
   the browser accepts it happily. Suggest the likely domain; never change it
   without the person agreeing. */
const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
  'icloud.com', 'msn.com', 'live.com', 'sbcglobal.net', 'att.net', 'comcast.net',
  'me.com', 'mac.com', 'ymail.com', 'mail.com', 'gmx.com', 'verizon.net', 'protonmail.com',
];

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

function checkEmail() {
  const [local, domain] = email.value.trim().toLowerCase().split('@');
  emailHint.hidden = true;
  emailHint.replaceChildren();
  if (!local || !domain || COMMON_DOMAINS.includes(domain)) return;

  /* Short domains sit close together, so they only get a one-letter allowance. */
  const allowance = domain.length >= 9 ? 2 : 1;
  const near = COMMON_DOMAINS.find((d) => distance(domain, d) <= allowance);
  if (!near) return;

  const fixed = local + '@' + near;
  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'text-button';
  accept.textContent = fixed;
  accept.addEventListener('click', () => {
    email.value = fixed;
    checkEmail();
    email.focus();
  });
  emailHint.append('Did you mean ', accept, '?');
  emailHint.hidden = false;
}

phone.addEventListener('blur', formatPhone);
email.addEventListener('blur', checkEmail);

/* --- sending ----------------------------------------------------------- */

/* The browser's own validation messages are better than anything hand-rolled,
   so let it do the checking and only take over once the form is actually valid. */
async function send(event) {
  event.preventDefault();

  formatPhone();
  if (!form.reportValidity()) return;

  submit.disabled = true;
  say('Sending...');

  const data = new FormData(form);
  data.set('_subject', request.value + ': ' + nameInput.value.trim());

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: data,
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const wasUpdate = !changeField.hidden;
    form.reset();
    setMode(false);
    emailHint.hidden = true;
    say(
      wasUpdate
        ? 'Thank you. Your change is on its way and will be made shortly.'
        : 'Thank you. Your details are on their way and will be added shortly.',
      'good'
    );
  } catch (err) {
    say(
      'That did not send. Please email your details instead, and mention this form failed.',
      'bad'
    );
  } finally {
    submit.disabled = false;
  }
}

if (FORM_ENDPOINT) {
  section.hidden = false;
  form.addEventListener('submit', send);
}
