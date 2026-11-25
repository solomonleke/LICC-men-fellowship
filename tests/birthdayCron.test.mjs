import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';

import {
  getLagosDateParts,
  parseBirthdayMonthDay,
  isBirthdayOnDate,
  isValidEmail,
  normalizeWhatsAppDigits,
  resolveBirthdayAlertExcos,
  buildBirthdayAlertPreview
} from '../server/birthdayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CODE_GS_PATH = path.join(__dirname, '..', 'google-apps-script', 'Code.gs');

function createAppsScriptHarness({
  initialSheets = {},
  scriptProperties = {},
  ownerEmail = 'owner@gmail.com',
  fixedDate = new Date('2026-11-25T06:00:00.000Z') // 07:00 AM WAT
} = {}) {
  const sheets = new Map();

  function makeSheet(name, rows = []) {
    const data = rows.map((r) => r.map((v) => (v === undefined || v === null ? '' : String(v))));
    return {
      _name: name,
      _data: data,
      _frozenRows: 0,
      getLastRow() {
        return data.length;
      },
      setFrozenRows(n) {
        this._frozenRows = n;
      },
      getRange(startRow, startCol, numRows, numCols) {
        return {
          setValues(values) {
            for (let r = 0; r < numRows; r++) {
              const rowIdx = startRow - 1 + r;
              if (!data[rowIdx]) data[rowIdx] = [];
              for (let c = 0; c < numCols; c++) {
                data[rowIdx][startCol - 1 + c] = values[r][c] === undefined || values[r][c] === null ? '' : String(values[r][c]);
              }
            }
            return this;
          },
          setValue(val) {
            const rowIdx = startRow - 1;
            if (!data[rowIdx]) data[rowIdx] = [];
            data[rowIdx][startCol - 1] = val === undefined || val === null ? '' : String(val);
            return this;
          },
          getDisplayValues() {
            const out = [];
            for (let r = 0; r < numRows; r++) {
              const rowIdx = startRow - 1 + r;
              const row = data[rowIdx] || [];
              const slice = [];
              for (let c = 0; c < numCols; c++) {
                slice.push(row[startCol - 1 + c] ?? '');
              }
              out.push(slice);
            }
            return out;
          },
          setFontWeight() { return this; },
          setBackground() { return this; },
          setFontColor() { return this; },
          setNumberFormat() { return this; }
        };
      },
      deleteRow(rowNumber) {
        data.splice(rowNumber - 1, 1);
      }
    };
  }

  for (const [name, rows] of Object.entries(initialSheets)) {
    sheets.set(name, makeSheet(name, rows));
  }

  const triggers = [];
  const logs = [];
  const sentEmails = [];
  const propsStore = { ...scriptProperties };

  const RealDate = Date;
  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedDate.getTime());
      } else {
        super(...args);
      }
    }
    static now() {
      return fixedDate.getTime();
    }
  }

  const sandbox = {
    console,
    Date: MockDate,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    encodeURIComponent,
    Logger: {
      log(msg) {
        logs.push(String(msg));
      }
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(k) {
            return Object.prototype.hasOwnProperty.call(propsStore, k) ? propsStore[k] : null;
          },
          setProperty(k, v) {
            propsStore[k] = String(v);
          }
        };
      }
    },
    Session: {
      getEffectiveUser() {
        return {
          getEmail() {
            return ownerEmail;
          }
        };
      }
    },
    MailApp: {
      sendEmail(options) {
        sentEmails.push(options);
      }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet() {
        return {
          getSheetByName(name) {
            return sheets.get(name) || null;
          },
          insertSheet(name) {
            const sheet = makeSheet(name, []);
            sheets.set(name, sheet);
            return sheet;
          },
          getSheets() {
            return Array.from(sheets.values());
          },
          deleteSheet(sheet) {
            sheets.delete(sheet._name);
          }
        };
      },
      getUi() {
        const menu = {
          addItem() { return menu; },
          addSeparator() { return menu; },
          addToUi() {}
        };
        return { createMenu() { return menu; } };
      }
    },
    ScriptApp: {
      getProjectTriggers() {
        return triggers.slice();
      },
      deleteTrigger(trigger) {
        const idx = triggers.indexOf(trigger);
        if (idx !== -1) triggers.splice(idx, 1);
      },
      newTrigger(handlerFunction) {
        const spec = {
          handlerFunction,
          everyDaysVal: null,
          atHourVal: null,
          nearMinuteVal: null,
          timezoneVal: null,
          getHandlerFunction() { return this.handlerFunction; }
        };
        const builder = {
          timeBased() { return builder; },
          everyDays(d) { spec.everyDaysVal = d; return builder; },
          atHour(h) { spec.atHourVal = h; return builder; },
          nearMinute(m) { spec.nearMinuteVal = m; return builder; },
          inTimezone(tz) { spec.timezoneVal = tz; return builder; },
          create() {
            triggers.push(spec);
            return spec;
          }
        };
        return builder;
      }
    },
    Utilities: {
      formatDate(date, tz, pattern) {
        const d = date instanceof RealDate ? date : new RealDate(date);
        if (pattern === 'yyyy-MM-dd') {
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(d);
        }
        if (pattern === 'd MMM') {
          const day = new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric' }).format(d);
          const month = new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'short' }).format(d);
          return `${day} ${month}`;
        }
        throw new Error(`Unsupported pattern in mock: ${pattern}`);
      }
    },
    LockService: {
      getScriptLock() {
        return {
          waitLock() {},
          releaseLock() {}
        };
      }
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(text) {
        return {
          _text: text,
          _mimeType: null,
          setMimeType(mime) { this._mimeType = mime; return this; },
          getContent() { return this._text; }
        };
      }
    }
  };

  vm.createContext(sandbox);
  const code = fs.readFileSync(CODE_GS_PATH, 'utf8');
  vm.runInContext(code, sandbox, { filename: 'Code.gs' });

  return { sandbox, sheets, triggers, logs, sentEmails };
}

test('parseBirthdayMonthDay parses Portal, ISO, and Nigerian numeric formats', () => {
  assert.deepEqual(parseBirthdayMonthDay('25 Nov'), { month: 11, day: 25 });
  assert.deepEqual(parseBirthdayMonthDay('14 Oct'), { month: 10, day: 14 });
  assert.deepEqual(parseBirthdayMonthDay('1st January'), { month: 1, day: 1 });
  assert.deepEqual(parseBirthdayMonthDay('Sept 9'), { month: 9, day: 9 });
  assert.deepEqual(parseBirthdayMonthDay('1991-11-25'), { month: 11, day: 25 });
  assert.deepEqual(parseBirthdayMonthDay('25/11/1990'), { month: 11, day: 25 });
  assert.deepEqual(parseBirthdayMonthDay('29 Feb'), { month: 2, day: 29 });
  assert.equal(parseBirthdayMonthDay('31 Feb'), null);
  assert.equal(parseBirthdayMonthDay(''), null);
});

test('isBirthdayOnDate handles Africa/Lagos timezone and leap-day birthdays', () => {
  const lagosParts = getLagosDateParts(new Date('2026-11-24T23:30:00.000Z'));
  assert.equal(lagosParts.isoDate, '2026-11-25');
  assert.equal(isBirthdayOnDate('25 Nov', lagosParts), true);
  assert.equal(isBirthdayOnDate('24 Nov', lagosParts), false);

  assert.equal(isBirthdayOnDate('29 Feb', { year: 2026, month: 2, day: 28 }), true);
  assert.equal(isBirthdayOnDate('29 Feb', { year: 2024, month: 2, day: 28 }), false);
  assert.equal(isBirthdayOnDate('29 Feb', { year: 2024, month: 2, day: 29 }), true);
});

test('resolveBirthdayAlertExcos targets EXCO-3/4/5 by default and validates Gmail addresses', () => {
  const defaultExcos = [
    { id: 'EXCO-1', role: 'PRESIDENT', name: 'Prof. Tolu', email: 'tolu@gmail.com' },
    { id: 'EXCO-3', role: 'GENERAL SECRETARY', name: 'Dr Damola', email: '' },
    { id: 'EXCO-4', role: 'ASST. GEN. SEC.', name: 'Bro Solomon', email: 'solomon@gmail.com' },
    { id: 'EXCO-5', role: 'SOCIAL SECRETARY', name: 'Bro Tobi', email: 'tobi@gmail.com' }
  ];

  const resolvedDefault = resolveBirthdayAlertExcos(defaultExcos);
  assert.deepEqual(resolvedDefault.map((e) => e.id), ['EXCO-3', 'EXCO-4', 'EXCO-5']);
  assert.equal(resolvedDefault[0].hasValidEmail, false);
  assert.equal(resolvedDefault[0].status, 'NEEDS_EMAIL');
  assert.equal(resolvedDefault[1].hasValidEmail, true);
  assert.equal(resolvedDefault[2].hasValidEmail, true);

  const customExcos = [
    { id: 'EXCO-1', role: 'PRESIDENT', name: 'Prof. Tolu', email: 'tolu@gmail.com', birthdayAlert: 'YES' },
    { id: 'EXCO-4', role: 'ASST. GEN. SEC.', name: 'Bro Solomon', email: 'solomon@gmail.com', birthdayAlert: 'NO' }
  ];
  const resolvedCustom = resolveBirthdayAlertExcos(customExcos);
  assert.deepEqual(resolvedCustom.map((e) => e.id), ['EXCO-1']);
  assert.equal(resolvedCustom[0].email, 'tolu@gmail.com');
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail('exco@gmail.com'), true);
});

test('findTodaysBirthdayMembers excludes dummy members and builds preview', () => {
  const members = [
    { id: 'MEM-1001', firstName: 'Emmanuel', lastName: 'Adeyemi', whatsappPhone: '+2348011111111', dob: '25 Nov' },
    { id: 'MEM-2001', firstName: 'Samuel', lastName: 'Ojo', occupation: 'Architect', whatsappPhone: '08055551234', dob: '25 Nov' },
    { id: 'MEM-2002', firstName: 'Peter', lastName: 'Bello', occupation: 'Doctor', whatsappPhone: '08055551235', dob: '14 Oct' }
  ];
  const excos = [
    { id: 'EXCO-4', role: 'ASST. GEN. SEC.', name: 'Bro Solomon', email: 'solomon@gmail.com', birthdayAlert: true }
  ];

  assert.equal(normalizeWhatsAppDigits('08055551234'), '2348055551234');
  const preview = buildBirthdayAlertPreview(members, excos, new Date('2026-11-25T07:00:00+01:00'));
  assert.equal(preview.date, '2026-11-25');
  assert.equal(preview.birthdayMembers.length, 1);
  assert.equal(preview.birthdayMembers[0].fullName, 'Samuel Ojo');
  assert.equal(preview.alertExcos.length, 1);
  assert.equal(preview.alertExcos[0].hasValidEmail, true);
});

test('Apps Script Code.gs setup, cron scheduling, Gmail dispatch, HTML escaping, and dedupe', () => {
  const harness = createAppsScriptHarness({
    initialSheets: {
      Sheet1: [],
      Members: [
        ['id', 'firstName', 'lastName', 'occupation', 'ageGroup', 'whatsappPhone', 'altPhone', 'dob', 'createdAt'],
        ['MEM-1001', 'Emmanuel', 'Adeyemi', 'Engineer', '30-39', '+2348090000001', '', '25 Nov', '2026-01-01'],
        ['MEM-9001', 'Chinedu', 'Okafor <Tech>', 'Civil & Structural', '40-49', '+2348051112233', '', '25 Nov', '2026-02-01'],
        ['MEM-9002', 'Tunde', 'Balogun', 'Lawyer', '30-39', '+2348051112244', '', '14 Oct', '2026-02-02']
      ],
      Excos: [
        ['id', 'role', 'name', 'phone', 'email', 'portfolio', 'order'],
        ['EXCO-1', 'PRESIDENT', 'Prof. Tolu Ososanya', '+2348033333331', 'tolu@gmail.com', 'Vision', '1'],
        ['EXCO-3', 'GENERAL SECRETARY', 'Dr Damola Oyejobi', '+2348033333333', '', 'Admin', '3'],
        ['EXCO-4', 'ASST. GEN. SEC.', 'Bro Solomon Adeleke', '+2348165413812', 'solomon@gmail.com', 'Secretariat', '4'],
        ['EXCO-5', 'SOCIAL SECRETARY', 'Bro Oluwatobi Oduntan', '+2348029998877', 'tobi@gmail.com', 'Welfare', '5']
      ]
    }
  });

  // 1. setup() preserves existing Excos and populates birthdayAlert defaults
  harness.sandbox.setup();
  const excosData = harness.sheets.get('Excos')._data;
  assert.equal(excosData[0][7], 'birthdayAlert');
  assert.equal(excosData[1][7], 'NO');  // EXCO-1
  assert.equal(excosData[2][7], 'YES'); // EXCO-3
  assert.equal(excosData[3][7], 'YES'); // EXCO-4
  assert.equal(excosData[4][7], 'YES'); // EXCO-5
  assert.ok(harness.sheets.has('BirthdayAlertLogs'));

  // 2. setupBirthdayCron() creates 1 daily 7 AM WAT trigger and prevents duplicates on re-run
  harness.sandbox.setupBirthdayCron();
  harness.sandbox.setupBirthdayCron();
  assert.equal(harness.triggers.length, 1);
  assert.equal(harness.triggers[0].handlerFunction, 'runBirthdayAlerts');
  assert.equal(harness.triggers[0].everyDaysVal, 1);
  assert.equal(harness.triggers[0].atHourVal, 7);
  assert.equal(harness.triggers[0].timezoneVal, 'Africa/Lagos');

  // 3. runBirthdayAlerts() emails EXCOs with valid Gmail addresses and skips missing-email EXCO-3
  const firstRun = harness.sandbox.runBirthdayAlerts();
  assert.equal(firstRun.counts.celebrants, 1);
  assert.equal(firstRun.counts.sent, 2);
  assert.equal(firstRun.counts.skippedMissingEmail, 1);
  assert.equal(firstRun.counts.failed, 0);
  assert.equal(harness.sentEmails.length, 2);

  const firstMail = harness.sentEmails[0];
  assert.equal(firstMail.to, 'solomon@gmail.com');
  assert.ok(firstMail.subject.includes("Chinedu Okafor <Tech>'s Birthday is Today (25 Nov)"));
  assert.ok(firstMail.body.includes('https://wa.me/2348051112233'));
  assert.ok(firstMail.htmlBody.includes('Chinedu Okafor &lt;Tech&gt;'));
  assert.ok(firstMail.htmlBody.includes('Civil &amp; Structural'));

  // 4. Second run on same day deduplicates already-sent EXCOs
  const secondRun = harness.sandbox.runBirthdayAlerts();
  assert.equal(secondRun.counts.sent, 0);
  assert.equal(secondRun.counts.skippedAlreadySent, 2);
  assert.equal(harness.sentEmails.length, 2);

  // 5. sendTestEmailAlert() sends to ALL ready EXCO recipients, or falls back to owner email when none exist
  const testAllResults = harness.sandbox.sendTestEmailAlert();
  assert.equal(testAllResults.length, 2);
  assert.deepEqual(Array.from(testAllResults, (r) => r.email), ['solomon@gmail.com', 'tobi@gmail.com']);
  assert.equal(harness.sentEmails.length, 4);

  const blankHarness = createAppsScriptHarness({ ownerEmail: 'fellowshipowner@gmail.com' });
  blankHarness.sandbox.setup();
  const testRes = blankHarness.sandbox.sendTestEmailAlert();
  assert.equal(testRes.length, 1);
  assert.equal(testRes[0].ok, true);
  assert.equal(blankHarness.sentEmails[0].to, 'fellowshipowner@gmail.com');

  // 6. doPost checkBirthdays validates token & returns dry-run preview
  const unauthRes = JSON.parse(
    harness.sandbox.doPost({ postData: { contents: JSON.stringify({ token: 'wrong', action: 'checkBirthdays' }) } }).getContent()
  );
  assert.equal(unauthRes.ok, false);

  const authRes = JSON.parse(
    harness.sandbox.doPost({ postData: { contents: JSON.stringify({ token: 'licc-fellowship-2026-secret-key', action: 'checkBirthdays' }) } }).getContent()
  );
  assert.equal(authRes.ok, true);
  assert.equal(authRes.data.birthdayMembers.length, 1);
  assert.equal(authRes.data.alertExcos.length, 3);
});

function invokeExpressApp(app, { method = 'GET', url = '/', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = new PassThrough();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = {};
    for (const [k, v] of Object.entries(headers)) {
      req.headers[k.toLowerCase()] = v;
    }
    const payloadStr = body !== null ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    if (payloadStr !== null) {
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      req.headers['content-length'] = String(Buffer.byteLength(payloadStr));
    }
    req.socket = { remoteAddress: '127.0.0.1' };
    req.connection = req.socket;

    const resHeaders = {};
    const chunks = [];
    const res = new EventEmitter();
    res.statusCode = 200;
    res.locals = {};
    res.setHeader = (k, v) => { resHeaders[k.toLowerCase()] = v; };
    res.getHeader = (k) => resHeaders[k.toLowerCase()];
    res.removeHeader = (k) => { delete resHeaders[k.toLowerCase()]; };
    res.writeHead = (code, hdrs = {}) => {
      res.statusCode = code;
      for (const [k, v] of Object.entries(hdrs)) {
        resHeaders[k.toLowerCase()] = v;
      }
      return res;
    };
    res.write = (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    };
    res.end = (chunk) => {
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const text = Buffer.concat(chunks).toString('utf8');
      let jsonBody = null;
      try {
        jsonBody = JSON.parse(text);
      } catch {
        // non-JSON body
      }
      res.emit('finish');
      resolve({ status: res.statusCode, headers: resHeaders, text, json: jsonBody });
    };

    app(req, res, (err) => {
      if (err) reject(err);
    });

    process.nextTick(() => {
      if (payloadStr !== null) {
        req.push(Buffer.from(payloadStr));
      }
      req.push(null);
    });
  });
}

test('Express birthday endpoints mask EXCO emails publicly and require admin for POST /api/birthdays/run', async () => {
  process.env.VERCEL = '1';
  const { default: app } = await import('../server/server.js');

  const publicRes = await invokeExpressApp(app, { method: 'GET', url: '/api/birthdays/today' });
  assert.equal(publicRes.status, 200);
  assert.equal(publicRes.json.timezone, 'Africa/Lagos');
  assert.ok(Array.isArray(publicRes.json.alertExcos));
  assert.equal(publicRes.json.alertExcos.length, 3);
  for (const ex of publicRes.json.alertExcos) {
    assert.equal(ex.status, 'NEEDS_EMAIL');
    assert.equal(ex.hasValidEmail, false);
  }

  const unauthRunRes = await invokeExpressApp(app, {
    method: 'POST',
    url: '/api/birthdays/run',
    body: { dryRun: true }
  });
  assert.equal(unauthRunRes.status, 403);
});
