/**
 * AC Ledger Solutions — enquiry log.
 * Paste into Extensions > Apps Script of a Google Sheet, then Deploy as a Web app.
 * The website posts each enquiry here; every enquiry becomes one row on the "Enquiries" tab.
 */
var SHEET_NAME = "Enquiries";
var HEADERS = ["Received", "Name", "Email", "Phone", "Service", "Message", "Page", "Status", "Notes"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var p = (e && e.parameter) || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#20244a").setFontColor("#ffffff");
      sh.setFrozenRows(1);
      sh.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm");
      sh.getRange("F:F").setWrap(true);
      sh.setColumnWidth(6, 420);
      sh.getRange("H2:H").setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(["New", "Contacted", "Quoted", "Won", "Closed"], true).build());
    }
    sh.appendRow([
      new Date(), safe(p.name), safe(p.email), safe(p.phone), safe(p.service), safe(p.message), safe(p.page), "New", ""
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Opening the web app URL in a browser shows this, so you can confirm the deployment works.
function doGet() { return json({ ok: true, service: "AC Ledger enquiry log" }); }

// Stops visitor text starting with = + - @ from being run as a spreadsheet formula.
function safe(v) {
  v = String(v == null ? "" : v).slice(0, 5000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
