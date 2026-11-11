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
  WEBSITE: 'www.acledgers.com',
  SHEET_NAME: 'AC Ledger Enquiries',
  // Leave blank if you created this script from the sheet (Extensions > Apps Script).
  // If the script is a standalone project, paste the sheet ID here (the long text between /d/ and /edit in the sheet URL).
  SPREADSHEET_ID: '',
  // Optional SMS alert to the owner via Semaphore (leave blank to skip)
  SEMAPHORE_KEY: '',
  OWNER_PHONE: '',                          // e.g. 09171234567
  // Optional shared secret: if set, the form must send the same value as "token"
  TOKEN: ''
};

const HEADERS = ['Time Received', 'Full name', 'Business name', 'Email', 'Phone', 'Service you\u2019re interested in', 'How can we help?', 'Notes'];

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
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground(CFG.BRAND_COLOR).setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
    const msgCol = HEADERS.indexOf('How can we help?') + 1, statusCol = HEADERS.indexOf('Status') + 1;
    if (msgCol) { sh.getRange(1, msgCol, sh.getMaxRows(), 1).setWrap(true); sh.setColumnWidth(msgCol, 420); }
    if (statusCol) sh.getRange(2, statusCol, sh.getMaxRows() - 1, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['New', 'Contacted', 'Quoted', 'Won', 'Closed'], true).build());
  }
  // Fill each cell by its header name, so renaming, removing or reordering columns never shifts the data
  const heads = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  sh.appendRow(heads.map(h => valueFor_(String(h), l)));
}

function valueFor_(h, l) {
  h = h.trim().toLowerCase();
  if (h === 'received' || h === 'time received') return new Date();
  if (h === 'name' || h === 'full name') return l.name;
  if (h === 'business name' || h === 'business' || h === 'company') return l.business;
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
    subject: 'New consultation request: ' + l.name,
    body: `${l.name}\n${l.business ? l.business + '\n' : ''}${l.email}\n${l.phone}\nService: ${l.service}\n\n${l.message}\n\n`,
    htmlBody: emailShell_('New consultation request', `
      <p style="margin:0 0 16px;font-size:20px;font-weight:700">${esc_(l.name)}</p>
      <table style="width:100%;font-size:15px;border-collapse:collapse">
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
    body: `Hi ${first},\n\nThank you for contacting ${CFG.BUSINESS}. We have received your consultation request and will get back to you shortly.\n\nIf your matter is urgent, please call us at ${CFG.PHONE}.\n\nFor your security, please do not email Social Security numbers, bank account numbers, or tax documents. We will arrange a secure way to share documents after we connect.\n\nBest regards,\n${CFG.BUSINESS}\nMelrose Park, IL\n${CFG.WEBSITE}`,
    htmlBody: emailShell_(CFG.BUSINESS, `
      <p style="margin:0 0 12px;font-size:20px;font-weight:700">Thanks, ${esc_(first)}. We got your request.</p>
      <p style="margin:0 0 16px;line-height:1.6">We will get back to you shortly. If your matter is urgent, please call us at ${esc_(CFG.PHONE)}.</p>
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
