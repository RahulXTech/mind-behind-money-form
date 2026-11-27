/**
 * Mind Behind Money — Connect form → Google Sheet
 *
 * Paste this whole file into: Google Sheet → Extensions → Apps Script → Code.gs
 * Then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps are in README.md.
 */

const SHEET_NAME = "Responses";

// Optional: put your email here to get an email for every new submission.
// Leave empty ("") to turn notifications off.
const NOTIFY_EMAIL = "";

// [form field key, column heading in the sheet, max length]
const FIELDS = [
  ["name",            "नाम",                          80],
  ["mobile",          "फ़ोन / WhatsApp",               25],
  ["email",           "ईमेल",                         120],
  ["city",            "शहर",                          60],
  ["help",            "किस चीज़ में मदद चाहिए",          300],
  ["businessName",    "बिज़नेस का नाम",                 100],
  ["businessType",    "बिज़नेस टाइप",                   100],
  ["industry",        "इंडस्ट्री",                      100],
  ["businessAge",     "बिज़नेस कितना पुराना है",          60],
  ["social",          "सोशल मीडिया हैंडल",               150],
  ["website",         "वेबसाइट",                        150],
  ["revenue",         "मंथली रेवेन्यू",                   60],
  ["marketingSpend",  "अभी मार्केटिंग ख़र्च / महीना",       60],
  ["marketingBudget", "आगे मार्केटिंग बजट",               60],
  ["problem",         "सबसे बड़ी परेशानी",                 170],
  ["goal",            "अगले 3 महीने का लक्ष्य",            300],
  ["startWhen",       "कब से शुरू करना चाहते हैं",          60],
  ["heardFrom",       "कहाँ से पता चला",                  100],
  ["callTime",        "कॉल का सही टाइम",                  30],
  ["source",          "Source",                        200],
  ["userAgent",       "Device",                        300],
];

const HEADERS = ["Timestamp"].concat(FIELDS.map((f) => f[1]));

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const p = (e && e.parameter) || {};
    const values = FIELDS.map(([key, , max]) => clean_(p[key], max));
    const get = (key) => values[FIELDS.findIndex((f) => f[0] === key)];

    if (!get("name") || !get("mobile") || !get("email")) {
      return json_({ result: "error", error: "Missing required fields" });
    }

    getSheet_().appendRow([new Date()].concat(values));

    if (NOTIFY_EMAIL) {
      const body = FIELDS.slice(0, -2) // skip Source/Device
        .map(([, label], i) => label + ": " + (values[i] || "—"))
        .join("\n");
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "नई लीड: " + get("name") + " (" + (get("city") || "शहर नहीं बताया") + ")",
        body: body,
        replyTo: get("email").replace(/^'/, ""),
      });
    }

    return json_({ result: "success" });
  } catch (err) {
    return json_({ result: "error", error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Lets you open the Web App URL in a browser to check it's live.
function doGet() {
  return json_({ result: "ok", message: "Mind Behind Money form endpoint is running." });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold").setBackground("#2A7470").setFontColor("#FFFFFF").setWrap(true);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);
    sheet.setColumnWidth(1, 150);
    sheet.getRange("A:A").setNumberFormat("dd-mmm-yyyy hh:mm am/pm");
    sheet.getRange("C:C").setNumberFormat("@"); // keep "+91 98765..." as text
  }
  return sheet;
}

// Trims input and blocks spreadsheet formula injection (=, +, -, @ at start).
function clean_(value, maxLen) {
  let v = String(value || "").trim().slice(0, maxLen);
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}





