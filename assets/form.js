/* The "get listed" form. The site is static, so the submission goes to a form
   service that emails it on. Set FORM_ENDPOINT to switch the form on: until it
   has one, the whole section stays hidden rather than shipping a button that
   quietly does nothing. */

const FORM_ENDPOINT = '';

const section = document.getElementById('signup');
const form = document.getElementById('signup-form');
const status = document.getElementById('f-status');
const submit = document.getElementById('f-submit');

function say(message, kind) {
  status.textContent = message;
  status.className = 'form-status' + (kind ? ' is-' + kind : '');
}

/* The browser's own validation messages are better than anything hand-rolled,
   so let it do the checking and only take over once the form is actually valid. */
async function send(event) {
  event.preventDefault();

  if (!form.reportValidity()) return;

  submit.disabled = true;
  say('Sending...');

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    form.reset();
    say('Thank you. Your details are on their way and will be added shortly.', 'good');
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
