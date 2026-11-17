/**
 * AC Ledger Solutions — Enquiry capture (Google Apps Script)
 * Website form -> saved to Google Sheet -> email alert to you -> auto-reply to the visitor.
 * Setup steps: docs/SETUP-GOOGLE-SHEET.md
 */
const CFG = {
  BUSINESS: 'AC Ledger Solutions',
  BRAND_COLOR: '#20244a',                   // used in the email design
  OWNER_EMAIL: 'kgdevstudio@gmail.com',     // where alerts go and where visitor replies land
  PHONE: '(773) 698-3538',
  PHONE_LINK: '+17736983538',               // digits for the tap-to-call link in the auto-reply
  CONTACT_EMAIL: 'charles@acledgers.com',   // direct email shown to the client in the auto-reply (same as the website)
  WEBSITE: 'www.acledgers.com',
  SHEET_NAME: 'AC Ledger Enquiries',
  // Leave blank if you created this script from the sheet (Extensions > Apps Script).
  // If the script is a standalone project, paste the sheet ID here (the long text between /d/ and /edit in the sheet URL).
  SPREADSHEET_ID: '',
  // Optional SMS alert to the owner via Semaphore (leave blank to skip)
  SEMAPHORE_KEY: '',
  OWNER_PHONE: '',                          // e.g. 09171234567
  // Optional shared secret: if set, the form must send the same value as "token"
  TOKEN: '',
  ID_PREFIX: 'ACL'                          // customer IDs look like ACL-0001
};

// ---- Status emails ----
// When the owner changes the Status cell in the sheet, the customer gets the matching email below.
// Statuses without an entry here (e.g. "New") send nothing. To add a status, add an entry; the dropdown updates when you run setup().
// {name} = customer's first name. If the "Appointment" cell is filled in, it is shown in the email automatically.
const STATUS_EMAILS = {
  'Booked': {
    subject: 'Your consultation is booked',
    heading: 'Your consultation is booked',
    body: 'Hi {name},\n\nGood news! Your consultation with ' + CFG.BUSINESS + ' is now booked. We will send you the final details shortly.'
  },
  'Scheduled': {
    subject: 'Your appointment is scheduled',
    heading: 'Your appointment is scheduled',
    body: 'Hi {name},\n\nYour appointment with ' + CFG.BUSINESS + ' is now scheduled. Please reply to this email if you need to change the time.'
  },
  'Completed': {
    subject: 'Thank you from AC Ledger Solutions',
    heading: 'Thank you',
    body: 'Hi {name},\n\nThank you for choosing ' + CFG.BUSINESS + '. We have completed your request. If you have any questions, just reply to this email.'
  },
  'Cancelled': {
    subject: 'Your consultation has been cancelled',
    heading: 'Your consultation has been cancelled',
    body: 'Hi {name},\n\nYour consultation with ' + CFG.BUSINESS + ' has been cancelled. If this is a mistake, or you would like to book again, please contact us.'
  }
};

const HEADERS = ['Time Received', 'Customer ID', 'Full name', 'Business name', 'Email', 'Phone', 'Service you\u2019re interested in', 'How can we help?', 'Status', 'Appointment', 'Notes', 'Customer Notified'];

// ---- Webhook endpoint (deploy as Web app) ----
function doPost(e) {
  try {
    const d = parseBody_(e);
    if (d._honey || d.company_website) return json_({ ok: true });     // honeypot: bots fill this, humans don't
    if (CFG.TOKEN && d.token !== CFG.TOKEN) return json_({ ok: false, error: 'unauthorized' });

    const lead = {
      name: clean_(d.name, 100), business: clean_(d.business, 100), email: clean_(d.email, 150).toLowerCase(),
      phone: cleanPhone_(d.phone), service: clean_(d.service, 100),
      message: clean_(d.message, 2000)
    };
    if (!lead.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email))
      return json_({ ok: false, error: 'Name and a valid email are required' });
    if (!/^\+\d{1,4} [0-9 ()\-]{6,20}$/.test(lead.phone) || !lead.service || !lead.message)
      return json_({ ok: false, error: 'Phone (with country code), service and message are required' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { saveLead_(lead); } finally { lock.releaseLock(); }

    // Alerts and replies run after the row is saved, so a mail failure never loses an enquiry
    safe_(() => alertOwner_(lead));
    safe_(() => autoReply_(lead));
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Server error: ' + (err && err.message || err) });
  }
}

function doGet() { return json_({ ok: true, service: 'ac-ledger-enquiries' }); }   // quick health check

// ---- Steps ----
function ss_() {
  const ss = CFG.SPREADSHEET_ID ? SpreadsheetApp.openById(CFG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: set CFG.SPREADSHEET_ID (this script is not attached to a sheet)');
  return ss;
}

function saveLead_(l) {
  const sh = ss_().getSheetByName(CFG.SHEET_NAME) || ss_().insertSheet(CFG.SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  formatSheet_(sh);
  // Fill each cell by its header name, so renaming, removing or reordering columns never shifts the data
  const heads = headers_(sh);
  l.id = idFor_(idIndex_(sh, heads), l.email);       // same email = same customer ID; new email = next number
  sh.appendRow(heads.map(h => valueFor_(h, l)));
}

// ---- Customer ID ----
// Reads the sheet once: which email already has which ID, and the highest number used so far
function idIndex_(sh, heads) {
  const idx = { byEmail: {}, max: 0 }, last = sh.getLastRow();
  const idCol = heads.indexOf('Customer ID') + 1, emCol = heads.indexOf('Email') + 1;
  if (!idCol || last < 2) return idx;
  const ids = sh.getRange(2, idCol, last - 1, 1).getValues();
  const ems = emCol ? sh.getRange(2, emCol, last - 1, 1).getValues() : [];
  ids.forEach((r, i) => {
    const id = String(r[0]).trim(), n = parseInt(id.replace(/\D/g, ''), 10);
    if (!id) return;
    if (n > idx.max) idx.max = n;
    const em = ems[i] ? String(ems[i][0]).trim().toLowerCase() : '';
    if (em && !idx.byEmail[em]) idx.byEmail[em] = id;
  });
  return idx;
}
function idFor_(idx, email) {
  email = String(email || '').trim().toLowerCase();
  if (email && idx.byEmail[email]) return idx.byEmail[email];
  idx.max++;
  const id = CFG.ID_PREFIX + '-' + ('0000' + idx.max).slice(-4);
  if (email) idx.byEmail[email] = id;
  return id;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(h => String(h).trim());
}

// Makes sure the sheet has the Status / Appointment / Customer Notified columns, the Status dropdown and the styling.
// Safe to run many times; it never touches existing data.
function formatSheet_(sh) {
  let heads = headers_(sh);
  if (heads.indexOf('Customer ID') === -1 && heads.length > 1 && heads[0]) {   // existing sheet: put the ID right after Time Received
    sh.insertColumnAfter(1);
    sh.getRange(1, 2).setValue('Customer ID');
    heads = headers_(sh);
  }
  HEADERS.forEach(h => {
    if (heads.indexOf(h) === -1) { sh.getRange(1, sh.getLastColumn() + 1).setValue(h); heads = headers_(sh); }
  });
  sh.getRange(1, 1, 1, heads.length).setFontWeight('bold').setBackground(CFG.BRAND_COLOR).setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  const idc = heads.indexOf('Customer ID') + 1;
  if (idc) { sh.getRange(2, idc, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@'); sh.setColumnWidth(idc, 90); }
  const msgCol = heads.indexOf('How can we help?') + 1, statusCol = heads.indexOf('Status') + 1;
  if (msgCol) { sh.getRange(1, msgCol, sh.getMaxRows(), 1).setWrap(true); sh.setColumnWidth(msgCol, 420); }
  if (statusCol) {
    const statuses = ['New'].concat(Object.keys(STATUS_EMAILS));
    sh.getRange(2, statusCol, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(statuses, true).setAllowInvalid(false).build());
  }
}

// ---- Status change -> email the customer ----
// Run this ONCE from the editor (it asks for permission). It sets up the sheet and installs the trigger.
function setup() {
  const sh = ss_().getSheetByName(CFG.SHEET_NAME) || ss_().insertSheet(CFG.SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  formatSheet_(sh);
  const heads = headers_(sh), statusCol = heads.indexOf('Status') + 1, last = sh.getLastRow();
  if (statusCol && last > 1) {                      // old rows without a status become "New" (no email is sent for this)
    const r = sh.getRange(2, statusCol, last - 1, 1), v = r.getValues();
    r.setValues(v.map(x => [x[0] === '' ? 'New' : x[0]]));
  }
  const idCol = heads.indexOf('Customer ID') + 1;
  if (idCol && last > 1) {                           // give existing customers an ID (same email = same ID)
    const idx = idIndex_(sh, heads), emCol = heads.indexOf('Email') + 1;
    const r = sh.getRange(2, idCol, last - 1, 1), v = r.getValues(), ems = emCol ? sh.getRange(2, emCol, last - 1, 1).getValues() : [];
    r.setValues(v.map((x, i) => [String(x[0]).trim() ? x[0] : idFor_(idx, ems[i] && ems[i][0])]));
  }
  const has = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'onStatusChange');
  if (!has) ScriptApp.newTrigger('onStatusChange').forSpreadsheet(ss_()).onEdit().create();
}

// Installable "on edit" trigger (a plain onEdit cannot send email, so setup() installs this one)
function onStatusChange(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet();
    if (sh.getName() !== CFG.SHEET_NAME) return;
    const heads = headers_(sh), statusCol = heads.indexOf('Status') + 1;
    if (!statusCol || statusCol < e.range.getColumn() || statusCol > e.range.getLastColumn()) return;
    for (let row = Math.max(e.range.getRow(), 2); row <= e.range.getLastRow(); row++) notifyRow_(sh, heads, row);
  } catch (err) { console.error(err); }
}

function notifyRow_(sh, heads, row) {
  const col = name => heads.indexOf(name) + 1;
  const get = name => col(name) ? sh.getRange(row, col(name)).getValue() : '';
  const status = String(get('Status')).trim(), tpl = STATUS_EMAILS[status];
  if (!tpl) return;                                  // "New" or any status without an email
  const notifiedCell = col('Customer Notified') ? sh.getRange(row, col('Customer Notified')) : null;
  const say = t => { if (notifiedCell) notifiedCell.setValue(t); };
  if (notifiedCell && String(notifiedCell.getValue()).indexOf(status + ' \u00b7') === 0) return;   // already emailed this status

  const email = String(get('Email')).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('Not sent: no valid email'); return; }
  const first = String(get('Full name')).trim().split(' ')[0] || 'there';
  const appt = apptText_(get('Appointment')), ref = String(get('Customer ID')).trim();
  try {
    sendStatusEmail_(email, first, status, tpl, appt, ref);
    say(status + ' \u00b7 ' + Utilities.formatDate(new Date(), ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm'));
  } catch (err) { console.error(err); say('Failed: ' + (err && err.message || err)); }
}

function apptText_(v) {
  if (v instanceof Date) {
    const tz = ss_().getSpreadsheetTimeZone(), hasTime = v.getHours() || v.getMinutes();
    return Utilities.formatDate(v, tz, hasTime ? "EEEE, MMMM d, yyyy 'at' h:mm a" : 'EEEE, MMMM d, yyyy');
  }
  return String(v || '').trim();
}

function sendStatusEmail_(to, first, status, tpl, appt, ref) {
  const text = tpl.body.replace(/\{name\}/g, first) + (appt ? '\n\nAppointment: ' + appt : '') + (ref ? '\nReference: ' + ref : '') +
    `\n\nQuestions? Call ${CFG.PHONE} or email ${CFG.CONTACT_EMAIL}.\n\nBest regards,\n${CFG.BUSINESS}\nMelrose Park, IL\n${CFG.WEBSITE}`;
  const paras = tpl.body.replace(/\{name\}/g, first).split(/\n\n+/).map(p =>
    `<p style="margin:0 0 14px;line-height:1.6;${/^Hi /.test(p) ? 'font-size:20px;font-weight:700' : ''}">${esc_(p)}</p>`).join('');
  MailApp.sendEmail({
    to: to, replyTo: CFG.OWNER_EMAIL, name: CFG.BUSINESS, subject: tpl.subject, body: text,
    htmlBody: emailShell_(tpl.heading, paras +
      (appt ? `<div style="background:#f3f4f8;border-radius:8px;padding:14px;margin:0 0 16px"><span style="color:#667;font-size:13px">Appointment</span><br><strong style="font-size:16px">${esc_(appt)}</strong></div>` : '') +
      (ref ? `<p style="margin:0 0 12px;font-size:13px;color:#667">Reference: <strong>${esc_(ref)}</strong></p>` : '') +
      `<p style="margin:0;line-height:1.6;font-size:14px;color:#445">Questions? Call <a href="tel:${esc_(CFG.PHONE_LINK)}" style="color:${CFG.BRAND_COLOR};font-weight:700;text-decoration:none">${esc_(CFG.PHONE)}</a> or email <a href="mailto:${esc_(CFG.CONTACT_EMAIL)}" style="color:${CFG.BRAND_COLOR};font-weight:700;text-decoration:none">${esc_(CFG.CONTACT_EMAIL)}</a>.</p>`)
  });
}

function valueFor_(h, l) {
  h = h.trim().toLowerCase();
  if (h === 'received' || h === 'time received') return new Date();
  if (h === 'name' || h === 'full name') return l.name;
  if (h === 'business name' || h === 'business' || h === 'company') return l.business;
  if (h === 'customer id') return l.id || '';
  if (h === 'email') return l.email;
  if (h === 'phone') return l.phone ? "'" + l.phone : '';
  if (h.indexOf('service') === 0) return l.service;
  if (h === 'message' || h === 'how can we help?') return l.message;
  if (h === 'status') return 'New';
  return '';
}

function alertOwner_(l) {
  const url = ss_().getUrl();
  MailApp.sendEmail({
    to: CFG.OWNER_EMAIL,
    replyTo: l.email,                                   // hit Reply to answer the visitor directly
    name: CFG.BUSINESS + ' website',
    subject: 'New consultation request: ' + l.name + ' (' + l.id + ')',
    body: `${l.name} (${l.id})\n${l.business ? l.business + '\n' : ''}${l.email}\n${l.phone}\nService: ${l.service}\n\n${l.message}\n\n`,
    htmlBody: emailShell_('New consultation request', `
      <p style="margin:0 0 16px;font-size:20px;font-weight:700">${esc_(l.name)}</p>
      <table style="width:100%;font-size:15px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#667">Customer ID</td><td><strong>${esc_(l.id) || '-'}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#667">Business</td><td>${esc_(l.business) || '-'}</td></tr>
        <tr><td style="padding:6px 0;color:#667">Email</td><td><a href="mailto:${esc_(l.email)}">${esc_(l.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#667">Phone</td><td>${esc_(l.phone) || '-'}</td></tr>
        <tr><td style="padding:6px 0;color:#667">Service</td><td>${esc_(l.service) || '-'}</td></tr>
      </table>
      <p style="margin:16px 0 6px;color:#667;font-size:13px">Message</p>
      <div style="background:#f3f4f8;border-radius:8px;padding:14px;white-space:pre-wrap">${esc_(l.message)}</div>
      <p style="margin:20px 0 0"><a href="${url}" style="background:${CFG.BRAND_COLOR};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open enquiry sheet</a></p>`)
  });
  if (CFG.SEMAPHORE_KEY && CFG.OWNER_PHONE) {
    UrlFetchApp.fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'post',
      payload: { apikey: CFG.SEMAPHORE_KEY, number: CFG.OWNER_PHONE,
                 message: `New enquiry: ${l.name} ${l.phone || l.email}` },
      muteHttpExceptions: true
    });
  }
}

function autoReply_(l) {
  const first = l.name.split(' ')[0];
  MailApp.sendEmail({
    to: l.email,
    replyTo: CFG.OWNER_EMAIL,
    name: CFG.BUSINESS,
    subject: `Thanks for contacting ${CFG.BUSINESS}`,
    body: `Hi ${first},\n\nThank you for contacting ${CFG.BUSINESS}. We have received your consultation request (reference ${l.id}) and will get back to you shortly.\n\nYou can also reach us directly:\nPhone: ${CFG.PHONE}\nEmail: ${CFG.CONTACT_EMAIL}\n\nFor your security, please do not email Social Security numbers, bank account numbers, or tax documents. We will arrange a secure way to share documents after we connect.\n\nBest regards,\n${CFG.BUSINESS}\nMelrose Park, IL\n${CFG.WEBSITE}`,
    htmlBody: emailShell_(CFG.BUSINESS, `
      <p style="margin:0 0 12px;font-size:20px;font-weight:700">Thanks, ${esc_(first)}. We got your request.</p>
      <p style="margin:0 0 16px;line-height:1.6">Your reference number is <strong>${esc_(l.id)}</strong>. We will get back to you shortly. If you would like to reach us directly in the meantime, or your matter is urgent, you can contact us here:</p>
      <table style="width:100%;margin:0 0 16px;background:#f3f4f8;border-radius:8px;font-size:15px;border-collapse:separate">
        <tr><td style="padding:12px 14px 4px;color:#667;width:70px">Phone</td><td style="padding:12px 14px 4px"><a href="tel:${esc_(CFG.PHONE_LINK)}" style="color:${CFG.BRAND_COLOR};font-weight:700;text-decoration:none">${esc_(CFG.PHONE)}</a></td></tr>
        <tr><td style="padding:4px 14px 12px;color:#667">Email</td><td style="padding:4px 14px 12px"><a href="mailto:${esc_(CFG.CONTACT_EMAIL)}" style="color:${CFG.BRAND_COLOR};font-weight:700;text-decoration:none">${esc_(CFG.CONTACT_EMAIL)}</a></td></tr>
      </table>
      <p style="margin:0 0 16px;line-height:1.6;font-size:14px;color:#445">For your security, please do not email Social Security numbers, bank account numbers, or tax documents. We will arrange a secure way to share documents after we connect.</p>`)
  });
}

// ---- Email design ----
function emailShell_(title, inner) {
  return `<div style="background:#eef0f5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#12141f">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:${CFG.BRAND_COLOR};color:#fff;padding:18px 24px;font-size:16px;font-weight:700">${esc_(title)}</div>
      <div style="padding:24px">${inner}</div>
      <div style="padding:14px 24px;background:#f7f8fa;color:#778;font-size:12px">${esc_(CFG.BUSINESS)} · Melrose Park, IL</div>
    </div></div>`;
}
function esc_(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- Helpers ----
function parseBody_(e) {
  const raw = (e.postData && e.postData.contents) || '';
  try { return JSON.parse(raw); } catch (_) { return e.parameter || {}; }   // JSON or normal form fields
}
// Strips leading = + - @ so a spreadsheet cell can never run as a formula
function clean_(v, max) { return String(v || '').trim().slice(0, max).replace(/^[=+\-@]+/, ''); }
// Phone keeps its leading + (country code); anything other than digits, spaces, ( ) - is removed
function cleanPhone_(v) { return String(v || '').trim().slice(0, 30).replace(/[^0-9+ ()\-]/g, '').replace(/(?!^)\+/g, ''); }
function safe_(fn) { try { fn(); } catch (e) { console.error(e); } }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// Run this once from the editor to test everything without the website
function testLead() {
  doPost({ postData: { contents: JSON.stringify({
    name: 'Test Customer', business: 'Test Business LLC', email: CFG.OWNER_EMAIL, phone: '+1 7735550123', service: 'Tax Preparation',
    message: 'This is a test enquiry.' }) } });
}
