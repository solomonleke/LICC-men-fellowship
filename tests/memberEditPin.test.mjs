import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';

import {
  isValidEditPinFormat,
  hashEditPin,
  verifyEditPin,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearFailedPinAttempts,
  sanitizeMemberForClient
} from '../server/pinSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CODE_GS_PATH = path.join(__dirname, '..', 'google-apps-script', 'Code.gs');
const EXCEL_PATH = path.join(__dirname, '..', 'server', 'data', 'licc_members_database.xlsx');

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
        // non-JSON
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

test('pinSecurity hashes, verifies, rate-limits, and strips editPinHash', () => {
  assert.equal(isValidEditPinFormat('4829'), true);
  assert.equal(isValidEditPinFormat('0007'), true);
  assert.equal(isValidEditPinFormat('482'), false);
  assert.equal(isValidEditPinFormat('abcd'), false);

  const hash = hashEditPin('4829');
  assert.ok(hash.includes(':'));
  assert.equal(verifyEditPin('4829', hash), true);
  assert.equal(verifyEditPin('9999', hash), false);
  assert.equal(verifyEditPin('4829', ''), false);

  const testId = 'MEM-RATE-TEST';
  clearFailedPinAttempts(testId);
  for (let i = 1; i <= 4; i++) {
    const res = recordFailedPinAttempt(testId, 1000);
    assert.equal(res.locked, false);
    assert.equal(checkPinRateLimit(testId, 1000).allowed, true);
  }
  const fifth = recordFailedPinAttempt(testId, 1000);
  assert.equal(fifth.locked, true);
  assert.equal(checkPinRateLimit(testId, 2000).allowed, false);
  assert.equal(checkPinRateLimit(testId, 1000 + 15 * 60 * 1000 + 1).allowed, true);
  clearFailedPinAttempts(testId);

  const sanitized = sanitizeMemberForClient({
    id: 'MEM-1',
    firstName: 'John',
    editPinHash: hash
  });
  assert.equal('editPinHash' in sanitized, false);
  assert.equal(sanitized.hasEditPin, true);

  const legacySanitized = sanitizeMemberForClient({
    id: 'MEM-2',
    firstName: 'Legacy',
    editPinHash: ''
  });
  assert.equal(legacySanitized.hasEditPin, false);
});

test('Apps Script Code.gs update action updates fields, checks duplicates excluding self, and preserves editPinHash', () => {
  const rows = [
    ['id', 'firstName', 'lastName', 'occupation', 'ageGroup', 'whatsappPhone', 'altPhone', 'dob', 'createdAt', 'editPinHash'],
    ['MEM-101', 'John', 'Ade', 'Engineer', '30-39', '+2348051110001', '', '12 May', '2026-01-01', 'salt1:hash1'],
    ['MEM-102', 'Peter', 'Obi', 'Doctor', '40-49', '+2348051110002', '', '15 Jun', '2026-01-02', 'salt2:hash2']
  ];
  const data = rows.map((r) => [...r]);

  const membersSheet = {
    getLastRow: () => data.length,
    setFrozenRows: () => {},
    getRange: (startRow, startCol, numRows, numCols) => ({
      setNumberFormat() { return this; },
      setValues(values) {
        for (let r = 0; r < numRows; r++) {
          const rowIdx = startRow - 1 + r;
          if (!data[rowIdx]) data[rowIdx] = [];
          for (let c = 0; c < numCols; c++) {
            data[rowIdx][startCol - 1 + c] = String(values[r][c] ?? '');
          }
        }
        return this;
      },
      getDisplayValues() {
        const out = [];
        for (let r = 0; r < numRows; r++) {
          const row = data[startRow - 1 + r] || [];
          const slice = [];
          for (let c = 0; c < numCols; c++) {
            slice.push(row[startCol - 1 + c] ?? '');
          }
          out.push(slice);
        }
        return out;
      }
    })
  };

  const sandbox = {
    console, JSON, Math, Number, String, Boolean, Array, Object, RegExp, Error, Date,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name) => (name === 'Members' ? membersSheet : null)
      })
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (t) => ({
        _t: t,
        setMimeType() { return this; },
        getContent() { return this._t; }
      })
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(CODE_GS_PATH, 'utf8'), sandbox, { filename: 'Code.gs' });

  // 1. Keeping own phone number succeeds & preserves editPinHash when omitted
  const okRes = JSON.parse(sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: 'licc-fellowship-2026-secret-key',
        sheet: 'Members',
        action: 'update',
        id: 'MEM-101',
        uniqueField: 'whatsappPhone',
        record: {
          firstName: 'John',
          lastName: 'Adeyinka',
          occupation: 'Architect',
          ageGroup: '30-39',
          whatsappPhone: '+2348051110001',
          altPhone: '',
          dob: '12 May'
        }
      })
    }
  }).getContent());

  assert.equal(okRes.ok, true);
  assert.equal(okRes.data.lastName, 'Adeyinka');
  assert.equal(okRes.data.editPinHash, 'salt1:hash1');
  assert.equal(data[1][2], 'Adeyinka');
  assert.equal(data[1][9], 'salt1:hash1');

  // 2. Trying to steal another member's phone number fails with DUPLICATE
  const dupRes = JSON.parse(sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: 'licc-fellowship-2026-secret-key',
        sheet: 'Members',
        action: 'update',
        id: 'MEM-101',
        uniqueField: 'whatsappPhone',
        record: {
          firstName: 'John',
          lastName: 'Adeyinka',
          occupation: 'Architect',
          ageGroup: '30-39',
          whatsappPhone: '+2348051110002',
          altPhone: '',
          dob: '12 May'
        }
      })
    }
  }).getContent());

  assert.equal(dupRes.ok, false);
  assert.equal(dupRes.error, 'DUPLICATE');
});

test('Express Member Registration, PIN verification, Edit Ownership, Legacy Lockout, and EXCO Admin Override', async () => {
  const originalExcelBytes = fs.existsSync(EXCEL_PATH) ? fs.readFileSync(EXCEL_PATH) : null;

  try {
    process.env.VERCEL = '1';
    const { updateGoogleSheetsConfig } = await import('../server/googleSheets.js');
    const { default: app } = await import('../server/server.js');
    delete process.env.VERCEL;
    updateGoogleSheetsConfig('offline', 'offline');

    // 1. Registration without 4-digit Edit PIN is rejected
    const missingPinRes = await invokeExpressApp(app, {
      method: 'POST',
      url: '/api/members',
      body: {
        firstName: 'Test',
        lastName: 'Brother',
        occupation: 'Software Engineer / IT Professional',
        ageGroup: '30-39',
        whatsappPhone: '08091234567',
        dob: '25 Nov'
      }
    });
    assert.equal(missingPinRes.status, 400);

    // 2. Registration with 4-digit Edit PIN succeeds and never leaks editPinHash
    const createRes = await invokeExpressApp(app, {
      method: 'POST',
      url: '/api/members',
      body: {
        firstName: 'Test',
        lastName: 'Brother',
        occupation: 'Software Engineer / IT Professional',
        ageGroup: '30-39',
        whatsappPhone: '08091234567',
        dob: '25 Nov',
        editPin: '4829'
      }
    });
    assert.equal(createRes.status, 201);
    assert.equal('editPinHash' in createRes.json, false);
    assert.equal(createRes.json.hasEditPin, true);
    const createdId = createRes.json.id;

    // 3. GET /api/members never leaks editPinHash
    const listRes = await invokeExpressApp(app, { method: 'GET', url: '/api/members' });
    assert.equal(listRes.status, 200);
    const listed = listRes.json.find((m) => m.id === createdId);
    assert.ok(listed);
    assert.equal('editPinHash' in listed, false);
    assert.equal(listed.hasEditPin, true);

    // Check phone excludes own ID when editing
    const selfPhoneCheck = await invokeExpressApp(app, {
      method: 'GET',
      url: `/api/members/check-phone?phone=${encodeURIComponent('+2348091234567')}&excludeId=${encodeURIComponent(createdId)}`
    });
    assert.equal(selfPhoneCheck.status, 200);
    assert.equal(selfPhoneCheck.json.exists, false);

    // 4. Wrong PIN fails verify-pin and PUT
    const badVerify = await invokeExpressApp(app, {
      method: 'POST',
      url: `/api/members/${createdId}/verify-pin`,
      body: { editPin: '1111' }
    });
    assert.equal(badVerify.status, 401);

    const badPut = await invokeExpressApp(app, {
      method: 'PUT',
      url: `/api/members/${createdId}`,
      body: {
        firstName: 'Hacked',
        lastName: 'Brother',
        occupation: 'Other',
        ageGroup: '30-39',
        whatsappPhone: '+2348091234567',
        dob: '25 Nov',
        editPin: '1111'
      }
    });
    assert.equal(badPut.status, 401);

    // 5. Correct PIN verifies and updates record + rotates PIN
    const goodVerify = await invokeExpressApp(app, {
      method: 'POST',
      url: `/api/members/${createdId}/verify-pin`,
      body: { editPin: '4829' }
    });
    assert.equal(goodVerify.status, 200);
    assert.equal(goodVerify.json.verified, true);

    const goodPut = await invokeExpressApp(app, {
      method: 'PUT',
      url: `/api/members/${createdId}`,
      body: {
        firstName: 'Test',
        lastName: 'Updated',
        occupation: 'Civil / Structural Engineer',
        ageGroup: '30-39',
        whatsappPhone: '+2348091234567',
        dob: '25 Nov',
        editPin: '4829',
        newEditPin: '7391'
      }
    });
    assert.equal(goodPut.status, 200);
    assert.equal(goodPut.json.lastName, 'Updated');
    assert.equal('editPinHash' in goodPut.json, false);
    assert.equal(goodPut.json.hasEditPin, true);

    // 6. Old PIN no longer works; new PIN works
    const oldPinVerify = await invokeExpressApp(app, {
      method: 'POST',
      url: `/api/members/${createdId}/verify-pin`,
      body: { editPin: '4829' }
    });
    assert.equal(oldPinVerify.status, 401);

    const newPinVerify = await invokeExpressApp(app, {
      method: 'POST',
      url: `/api/members/${createdId}/verify-pin`,
      body: { editPin: '7391' }
    });
    assert.equal(newPinVerify.status, 200);

    // 7. Legacy member without PIN (hasEditPin: false) blocks non-admin and allows EXCO Admin to edit/assign PIN
    const legacy = listRes.json.find((m) => m.hasEditPin === false);
    if (legacy) {
      const legacyNonAdminVerify = await invokeExpressApp(app, {
        method: 'POST',
        url: `/api/members/${legacy.id}/verify-pin`,
        body: { editPin: '1234' }
      });
      assert.equal(legacyNonAdminVerify.status, 403);
      assert.equal(legacyNonAdminVerify.json.requiresAdmin, true);

      const legacyNonAdminPut = await invokeExpressApp(app, {
        method: 'PUT',
        url: `/api/members/${legacy.id}`,
        body: {
          firstName: legacy.firstName,
          lastName: legacy.lastName,
          occupation: legacy.occupation,
          ageGroup: legacy.ageGroup,
          whatsappPhone: legacy.whatsappPhone,
          dob: legacy.dob,
          editPin: '1234'
        }
      });
      assert.equal(legacyNonAdminPut.status, 403);
      assert.equal(legacyNonAdminPut.json.requiresAdmin, true);

      const legacyAdminAssign = await invokeExpressApp(app, {
        method: 'PUT',
        url: `/api/members/${legacy.id}`,
        headers: { 'x-admin-passcode': 'licc-exco-2026' },
        body: {
          firstName: legacy.firstName,
          lastName: legacy.lastName,
          occupation: legacy.occupation,
          ageGroup: legacy.ageGroup,
          whatsappPhone: legacy.whatsappPhone,
          dob: legacy.dob,
          newEditPin: '2468'
        }
      });
      assert.equal(legacyAdminAssign.status, 200);
      assert.equal(legacyAdminAssign.json.hasEditPin, true);

      const legacyPinNowWorks = await invokeExpressApp(app, {
        method: 'POST',
        url: `/api/members/${legacy.id}/verify-pin`,
        body: { editPin: '2468' }
      });
      assert.equal(legacyPinNowWorks.status, 200);
      clearFailedPinAttempts(legacy.id);
    }

    // 8. EXCO Admin can edit without member PIN
    const adminPut = await invokeExpressApp(app, {
      method: 'PUT',
      url: `/api/members/${createdId}`,
      headers: { 'x-admin-passcode': 'licc-exco-2026' },
      body: {
        firstName: 'Test',
        lastName: 'AdminEdited',
        occupation: 'Civil / Structural Engineer',
        ageGroup: '40-49',
        whatsappPhone: '+2348091234567',
        dob: '25 Nov'
      }
    });
    assert.equal(adminPut.status, 200);
    assert.equal(adminPut.json.lastName, 'AdminEdited');
    assert.equal(adminPut.json.ageGroup, '40-49');

    clearFailedPinAttempts(createdId);
  } finally {
    if (originalExcelBytes) {
      fs.writeFileSync(EXCEL_PATH, originalExcelBytes);
    }
  }
});
