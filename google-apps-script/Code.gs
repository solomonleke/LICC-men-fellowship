/**
 * LICC Men Fellowship - Google Sheets backend (Google Apps Script web app)
 *
 * Paste this whole file into your Google Sheet: Extensions > Apps Script.
 * Then follow GOOGLE_SHEETS_SETUP.md in the project root.
 *
 * Only the Express backend should call this web app. Every request must
 * include API_TOKEN, so keep the token secret (it lives in the server's .env).
 */

// 1. CHANGE THIS to a long random secret, and put the same value in .env (GOOGLE_SHEETS_TOKEN)
const API_TOKEN = 'licc-fellowship-2026-secret-key';

// Tabs and column headers. Row 1 of each tab holds these exact header names.
const SCHEMA = {
  Members: ['id', 'firstName', 'lastName', 'occupation', 'ageGroup', 'whatsappPhone', 'altPhone', 'createdAt'],
  Showcases: ['id', 'authorPhone', 'authorName', 'title', 'category', 'description', 'imageUrl', 'whatsappContact', 'createdAt', 'likes'],
  Comments: ['id', 'postId', 'authorName', 'commentText', 'createdAt'],
  Events: ['id', 'title', 'category', 'eventDate', 'eventTime', 'venue', 'description', 'bannerUrl', 'createdBy', 'createdAt'],
  Excos: ['id', 'role', 'name', 'phone', 'email', 'portfolio', 'order']
};

/**
 * 2. Run this once from the Apps Script editor (select "setup" > Run).
 * Creates the Members, Showcases and Comments tabs with their headers.
 * Safe to run again: it never deletes data.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const headers = SCHEMA[name];
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#0f766e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  });

  // Remove the empty default tab if it is still there
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}

// Health check: open the web app URL in a browser to confirm it is deployed
function doGet() {
  return json({ ok: true, data: 'LICC Men Fellowship Sheets API is running' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' });
  }

  if (body.token !== API_TOKEN) {
    return json({ ok: false, error: 'Unauthorized' });
  }

  // One request at a time, so two people can't register the same phone simultaneously
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return json({ ok: true, data: handle(body) });
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function handle(body) {
  const name = body.sheet;
  const sheet = getSheet(name);
  const headers = SCHEMA[name];

  switch (body.action) {
    case 'list':
      return readAll(sheet, name).map(stripRowNumber);

    case 'append': {
      const record = body.record || {};
      if (body.uniqueField) {
        const target = digitsOnly(record[body.uniqueField]);
        const exists = target && readAll(sheet, name).some(function (r) {
          return digitsOnly(r[body.uniqueField]) === target;
        });
        if (exists) throw new Error('DUPLICATE');
      }
      const row = headers.map(function (h) {
        return record[h] === undefined || record[h] === null ? '' : String(record[h]);
      });
      const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length);
      range.setNumberFormat('@'); // plain text, so "+234..." is not turned into a number
      range.setValues([row]);
      return record;
    }

    case 'increment': {
      const rec = findById(sheet, name, body.id);
      const col = headers.indexOf(body.field) + 1;
      if (col < 1) throw new Error('Unknown field: ' + body.field);
      const next = (Number(rec[body.field]) || 0) + 1;
      sheet.getRange(rec._row, col).setNumberFormat('@').setValue(String(next));
      return next;
    }

    case 'delete': {
      const rec = findById(sheet, name, body.id);
      sheet.deleteRow(rec._row);
      return true;
    }

    default:
      throw new Error('Unknown action: ' + body.action);
  }
}

function getSheet(name) {
  if (!SCHEMA[name]) throw new Error('Unknown sheet: ' + name);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = SCHEMA[name];
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#0f766e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readAll(sheet, name) {
  const headers = SCHEMA[name];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  return values
    .map(function (row, i) {
      const obj = { _row: i + 2 };
      headers.forEach(function (h, j) { obj[h] = row[j]; });
      return obj;
    })
    .filter(function (obj) { return obj.id; }); // skip blank rows
}

function findById(sheet, name, id) {
  const rec = readAll(sheet, name).filter(function (r) { return r.id === String(id); })[0];
  if (!rec) throw new Error('NOT_FOUND');
  return rec;
}

function stripRowNumber(obj) {
  const copy = {};
  Object.keys(obj).forEach(function (k) { if (k !== '_row') copy[k] = obj[k]; });
  return copy;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
