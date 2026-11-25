/**
 * LICC Men's Fellowship - Google Sheets Backend & Daily Birthday Gmail Cron
 *
 * Paste this whole file into your Google Sheet: Extensions > Apps Script.
 * Then follow GOOGLE_SHEETS_SETUP.md in the project root.
 *
 * Only the Express backend should call the HTTP web app endpoints. Every request must
 * include API_TOKEN, so keep the token secret (it lives in the server's .env).
 */

// 1. CHANGE THIS to a long random secret, and put the same value in .env (GOOGLE_SHEETS_TOKEN)
const API_TOKEN = 'licc-fellowship-2026-secret-key';

const FELLOWSHIP_TIMEZONE = 'Africa/Lagos';
const SENDER_DISPLAY_NAME = "LICC Men's Fellowship Portal";

const DEFAULT_ALERT_EXCO_IDS = ['EXCO-3', 'EXCO-4', 'EXCO-5'];
const DEFAULT_ALERT_EXCO_ROLES = ['GENERAL SECRETARY', 'ASST. GEN. SEC.', 'SOCIAL SECRETARY'];

const DUMMY_MEMBER_IDS = ['MEM-1001', 'MEM-1002', 'MEM-1003', 'MEM-1004', 'MEM-1005'];
const DUMMY_MEMBER_NAMES = ['emmanuel adeyemi', 'david okonkwo'];

const DEFAULT_EXCOS = [
  { id: 'EXCO-1', role: 'PRESIDENT', name: 'Prof. Tolu Ososanya', phone: '+2348033333331', email: '', portfolio: 'Overall Leadership, Fellowship Vision & Spiritual Oversight', order: '1', birthdayAlert: 'NO' },
  { id: 'EXCO-2', role: 'VICE PRESIDENT', name: 'Bro Feyi Ijimakinwa', phone: '+2348033333332', email: '', portfolio: 'Programs, Strategy & Executive Coordination', order: '2', birthdayAlert: 'NO' },
  { id: 'EXCO-3', role: 'GENERAL SECRETARY', name: 'Dr Damola Oyejobi', phone: '+2348033333333', email: '', portfolio: 'Administration, Documentation, Records & Communications', order: '3', birthdayAlert: 'YES' },
  { id: 'EXCO-4', role: 'ASST. GEN. SEC.', name: 'Bro Solomon Adeleke', phone: '+2348165413812', email: '', portfolio: 'Secretariat, Digital Systems & Data Operations', order: '4', birthdayAlert: 'YES' },
  { id: 'EXCO-5', role: 'SOCIAL SECRETARY', name: 'Bro Oluwatobi Oduntan', phone: '+2348033333335', email: '', portfolio: 'Welfare, Socials, Fellowship Hospitality & Events Logistics', order: '5', birthdayAlert: 'YES' },
  { id: 'EXCO-6', role: 'FINANCIAL SEC', name: 'Bro Tayo Olayinka', phone: '+2348033333336', email: '', portfolio: 'Financial Records, Accounts, Dues & Treasury Oversight', order: '6', birthdayAlert: 'NO' }
];

// Tabs and column headers. Row 1 of each tab holds these exact header names.
const SCHEMA = {
  Members: ['id', 'firstName', 'lastName', 'occupation', 'ageGroup', 'whatsappPhone', 'altPhone', 'dob', 'createdAt', 'editPinHash'],
  Showcases: ['id', 'authorPhone', 'authorName', 'title', 'category', 'description', 'imageUrl', 'whatsappContact', 'createdAt', 'likes'],
  Comments: ['id', 'postId', 'authorName', 'commentText', 'createdAt'],
  Events: ['id', 'title', 'category', 'eventDate', 'eventTime', 'venue', 'description', 'bannerUrl', 'createdBy', 'createdAt'],
  Excos: ['id', 'role', 'name', 'phone', 'email', 'portfolio', 'order', 'birthdayAlert'],
  BirthdayAlertLogs: ['id', 'sentDate', 'memberId', 'memberName', 'dob', 'excoId', 'excoName', 'excoEmail', 'status', 'error', 'createdAt']
};

/**
 * Adds a handy menu directly inside the Google Sheet UI for EXCO admins.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("LICC Fellowship")
    .addItem("Preview Today's Birthdays (Dry Run)", 'dryRunBirthdayAlerts')
    .addItem('Send Birthday Emails Now', 'runBirthdayAlerts')
    .addSeparator()
    .addItem('Send Test Birthday Email', 'sendTestEmailAlert')
    .addItem('Install Daily 7:00 AM WAT Cron', 'setupBirthdayCron')
    .addItem('Remove Daily Cron', 'removeBirthdayCron')
    .addSeparator()
    .addItem('Initialize / Update Sheet Tabs', 'setup')
    .addToUi();
}

/**
 * 2. Run this once from the Apps Script editor (select "setup" > Run).
 * Creates or updates all tabs with their headers, and seeds default EXCOs if empty.
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

  // Seed Excos tab if empty, or populate default birthdayAlert flags if all blank
  const excosSheet = ss.getSheetByName('Excos');
  if (excosSheet) {
    if (excosSheet.getLastRow() < 2) {
      const headers = SCHEMA.Excos;
      const rows = DEFAULT_EXCOS.map(function (ex) {
        return headers.map(function (h) { return ex[h] || ''; });
      });
      const range = excosSheet.getRange(2, 1, rows.length, headers.length);
      range.setNumberFormat('@');
      range.setValues(rows);
    } else {
      const existing = readAll(excosSheet, 'Excos');
      const hasAnyFlag = existing.some(function (ex) {
        return String(ex.birthdayAlert || '').trim() !== '';
      });
      if (!hasAnyFlag && existing.length > 0) {
        const flagCol = SCHEMA.Excos.indexOf('birthdayAlert') + 1;
        existing.forEach(function (ex) {
          const val = isDefaultAlertExco(ex) ? 'YES' : 'NO';
          excosSheet.getRange(ex._row, flagCol).setNumberFormat('@').setValue(val);
        });
      }
    }
  }

  // Remove the empty default tab if it is still there
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}

/**
 * 3. Run this once from the Apps Script editor to schedule the daily
 * 7:00 AM WAT (Africa/Lagos) birthday email cron job.
 */
function setupBirthdayCron() {
  removeBirthdayCron();

  ScriptApp.newTrigger('runBirthdayAlerts')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .nearMinute(0)
    .inTimezone(FELLOWSHIP_TIMEZONE)
    .create();

  Logger.log('Installed daily birthday Gmail cron trigger: runBirthdayAlerts at 7:00 AM (' + FELLOWSHIP_TIMEZONE + ').');
}

/**
 * Removes any existing daily birthday cron triggers.
 */
function removeBirthdayCron() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'runBirthdayAlerts') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log('Removed ' + removed + ' existing runBirthdayAlerts trigger(s).');
}

/**
 * Scheduled daily cron target (7:00 AM WAT).
 * Checks today's birthdays and sends Gmail alerts to enabled EXCO members.
 */
function runBirthdayAlerts() {
  const result = executeBirthdayAlertCheck({ dryRun: false, force: false });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Safe preview function: logs today's birthday celebrants and resolved EXCO
 * email recipients without sending any emails.
 */
function dryRunBirthdayAlerts() {
  const result = executeBirthdayAlertCheck({ dryRun: true, force: false });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Sends a test birthday alert email directly using Google MailApp.
 * Uses TEST_EMAIL_TO Script Property if set; otherwise sends to ALL enabled
 * EXCO recipients (birthdayAlert = YES) with valid emails, or falls back to
 * the Google Sheet owner's own Gmail address.
 */
function sendTestEmailAlert() {
  const props = PropertiesService.getScriptProperties();
  const overrideEmail = String(props.getProperty('TEST_EMAIL_TO') || '').trim();

  let targets = [];
  if (isValidEmail(overrideEmail)) {
    targets = [{
      id: 'TEST',
      role: 'EXCO TEST',
      name: 'EXCO Leader',
      email: overrideEmail
    }];
  } else {
    const excosSheet = getSheet('Excos');
    const excos = readAll(excosSheet, 'Excos');
    const resolved = resolveBirthdayAlertExcos(excos);
    targets = resolved.filter(function (ex) { return ex.hasValidEmail; });
  }

  if (targets.length === 0) {
    const ownerEmail = Session.getEffectiveUser().getEmail();
    if (isValidEmail(ownerEmail)) {
      targets = [{
        id: 'OWNER',
        role: 'SHEET OWNER',
        name: 'EXCO Admin',
        email: ownerEmail
      }];
    }
  }

  if (targets.length === 0) {
    throw new Error('No valid email found. Add Gmail addresses in the Excos tab (email column) or set TEST_EMAIL_TO.');
  }

  const sampleMember = {
    id: 'TEST-MEMBER',
    firstName: 'Test',
    lastName: 'Celebrant',
    occupation: 'Fellowship Member',
    dob: formatLagosMonthDay(new Date()),
    whatsappPhone: '+2348000000000'
  };

  const results = targets.map(function (targetExco) {
    const res = sendBirthdayEmail(targetExco, sampleMember, sampleMember.dob);
    Logger.log('Test email result to ' + targetExco.name + ' (' + targetExco.email + '): ' + JSON.stringify(res));
    return {
      excoId: targetExco.id,
      name: targetExco.name,
      email: targetExco.email,
      ok: res.ok,
      error: res.error || ''
    };
  });

  return results;
}

// Health check: open the web app URL in a browser to confirm it is deployed
function doGet() {
  return json({ ok: true, data: "LICC Men's Fellowship Sheets API is running" });
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

  // READ-ONLY requests do not mutate data — process immediately without locking
  if (body.action === 'list' || body.action === 'checkBirthdays') {
    try {
      return json({ ok: true, data: handle(body) });
    } catch (err) {
      return json({ ok: false, error: String((err && err.message) || err) });
    }
  }

  // WRITE requests acquire lock to prevent concurrent write races / duplicate sends
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return json({ ok: true, data: handle(body) });
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function handle(body) {
  if (body.action === 'checkBirthdays') {
    return executeBirthdayAlertCheck({ dryRun: true, force: false });
  }

  if (body.action === 'runBirthdayAlerts') {
    return executeBirthdayAlertCheck({
      dryRun: Boolean(body.dryRun),
      force: Boolean(body.force)
    });
  }

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
        let val = record[h];
        if (h === 'dob' && (val === undefined || val === null || val === '')) {
          val = record['dom'];
        }
        return val === undefined || val === null ? '' : String(val);
      });
      const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length);
      range.setNumberFormat('@'); // plain text, so "+234..." is not turned into a number
      range.setValues([row]);
      return record;
    }

    case 'update': {
      const rec = findById(sheet, name, body.id);
      const updates = body.record || {};
      if (body.uniqueField && updates[body.uniqueField] !== undefined) {
        const target = digitsOnly(updates[body.uniqueField]);
        const exists = target && readAll(sheet, name).some(function (r) {
          return r.id !== String(body.id) && digitsOnly(r[body.uniqueField]) === target;
        });
        if (exists) throw new Error('DUPLICATE');
      }
      const updated = {};
      const row = headers.map(function (h) {
        let val;
        if (h === 'id' || h === 'createdAt') {
          val = rec[h];
        } else if (Object.prototype.hasOwnProperty.call(updates, h) && updates[h] !== undefined) {
          val = updates[h];
        } else if (h === 'dob' && Object.prototype.hasOwnProperty.call(updates, 'dom') && updates.dom !== undefined) {
          val = updates.dom;
        } else {
          val = rec[h];
        }
        const strVal = val === undefined || val === null ? '' : String(val);
        updated[h] = strVal;
        return strVal;
      });
      const range = sheet.getRange(rec._row, 1, 1, headers.length);
      range.setNumberFormat('@');
      range.setValues([row]);
      if (updated.dob) updated.dom = updated.dob;
      return updated;
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

// ----------------- BIRTHDAY CHECK & GMAIL ALERT ENGINE -----------------

function executeBirthdayAlertCheck(options) {
  const opts = options || {};
  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);

  const now = new Date();
  const today = getLagosDateParts(now);

  const membersSheet = getSheet('Members');
  const excosSheet = getSheet('Excos');
  const members = readAll(membersSheet, 'Members');
  const rawExcos = readAll(excosSheet, 'Excos');
  const excosSource = rawExcos.length > 0 ? rawExcos : DEFAULT_EXCOS;

  const birthdayMembers = members.filter(function (m) {
    if (!isValidMemberRecord(m)) return false;
    return isBirthdayOnDate(m.dob || m.dom || '', today);
  });

  const alertExcos = resolveBirthdayAlertExcos(excosSource);
  const summary = {
    date: today.isoDate,
    timezone: FELLOWSHIP_TIMEZONE,
    dryRun: dryRun,
    birthdayMembers: birthdayMembers.map(function (m) {
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        fullName: (String(m.firstName || '').trim() + ' ' + String(m.lastName || '').trim()).trim(),
        occupation: m.occupation || '',
        dob: m.dob || m.dom || '',
        whatsappPhone: formatDisplayPhone(m.whatsappPhone)
      };
    }),
    alertExcos: alertExcos.map(function (ex) {
      return {
        id: ex.id,
        role: ex.role,
        name: ex.name,
        email: ex.email,
        hasValidEmail: ex.hasValidEmail,
        status: ex.status
      };
    }),
    counts: {
      celebrants: birthdayMembers.length,
      recipientsConfigured: alertExcos.length,
      sent: 0,
      skippedAlreadySent: 0,
      skippedMissingEmail: 0,
      failed: 0
    },
    results: []
  };

  if (birthdayMembers.length === 0 || dryRun) {
    return summary;
  }

  const logsSheet = getSheet('BirthdayAlertLogs');
  const existingLogs = readAll(logsSheet, 'BirthdayAlertLogs');
  const sentTodayKeys = {};
  existingLogs.forEach(function (log) {
    if (String(log.sentDate) === today.isoDate && String(log.status) === 'SENT') {
      sentTodayKeys[log.memberId + '|' + log.excoId] = true;
    }
  });

  birthdayMembers.forEach(function (member) {
    const memberName = (String(member.firstName || '').trim() + ' ' + String(member.lastName || '').trim()).trim();
    const dobDisplay = String(member.dob || member.dom || '').trim() || formatLagosMonthDay(now);

    alertExcos.forEach(function (exco) {
      const dedupeKey = member.id + '|' + exco.id;

      if (!force && sentTodayKeys[dedupeKey]) {
        summary.counts.skippedAlreadySent++;
        summary.results.push({
          memberId: member.id,
          memberName: memberName,
          excoId: exco.id,
          excoName: exco.name,
          status: 'SKIPPED_ALREADY_SENT'
        });
        return;
      }

      if (!exco.hasValidEmail) {
        summary.counts.skippedMissingEmail++;
        const reason = 'Missing or invalid Gmail/email address in Excos sheet (' + (exco.email || 'empty') + ').';
        appendBirthdayLog(logsSheet, {
          sentDate: today.isoDate,
          memberId: member.id,
          memberName: memberName,
          dob: dobDisplay,
          excoId: exco.id,
          excoName: exco.name,
          excoEmail: exco.email || '',
          status: 'SKIPPED_MISSING_EMAIL',
          error: reason
        });
        summary.results.push({
          memberId: member.id,
          memberName: memberName,
          excoId: exco.id,
          excoName: exco.name,
          status: 'SKIPPED_MISSING_EMAIL',
          error: reason
        });
        return;
      }

      const sendResult = sendBirthdayEmail(exco, member, dobDisplay);
      if (sendResult.ok) {
        summary.counts.sent++;
        sentTodayKeys[dedupeKey] = true;
      } else {
        summary.counts.failed++;
      }

      appendBirthdayLog(logsSheet, {
        sentDate: today.isoDate,
        memberId: member.id,
        memberName: memberName,
        dob: dobDisplay,
        excoId: exco.id,
        excoName: exco.name,
        excoEmail: exco.email,
        status: sendResult.ok ? 'SENT' : 'FAILED',
        error: sendResult.error || ''
      });

      summary.results.push({
        memberId: member.id,
        memberName: memberName,
        excoId: exco.id,
        excoName: exco.name,
        excoEmail: exco.email,
        status: sendResult.ok ? 'SENT' : 'FAILED',
        error: sendResult.error || ''
      });
    });
  });

  return summary;
}

function sendBirthdayEmail(exco, member, dobDisplay) {
  const firstName = String(member.firstName || '').trim();
  const memberFullName = (firstName + ' ' + String(member.lastName || '').trim()).trim();
  const occupationDisplay = String(member.occupation || '').trim() || 'Fellowship Member';
  const memberPhoneDisplay = formatDisplayPhone(member.whatsappPhone) || 'Not Provided';
  const waDigits = normalizeWhatsAppDigits(member.whatsappPhone);
  const waLink = waDigits
    ? ('https://wa.me/' + waDigits + '?text=' + encodeURIComponent('Happy Birthday Bro ' + (firstName || memberFullName) + "! Wishing you God's abundant blessings from LICC Men's Fellowship."))
    : '';

  const subject = "🎂 LICC Birthday Alert: " + memberFullName + "'s Birthday is Today (" + dobDisplay + ')';

  const plainBody = [
    'Praise God ' + exco.name + ' (' + exco.role + '),',
    '',
    'This is a reminder from the LICC Men\'s Fellowship Portal that today (' + dobDisplay + ') is our brother ' + memberFullName + "'s birthday!",
    '',
    'Celebrant Details:',
    '- Name: ' + memberFullName,
    '- Birthday: ' + dobDisplay,
    '- Occupation: ' + occupationDisplay,
    '- WhatsApp / Phone: ' + memberPhoneDisplay,
    waLink ? ('- Quick WhatsApp Wish Link: ' + waLink) : '',
    '',
    'Please reach out and celebrate with him today.',
    '',
    "LICC Men's Fellowship • Light Cathedral, Samonda, Ibadan"
  ].filter(Boolean).join('\n');

  const htmlBody = [
    '<div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #0f172a;">',
    '  <div style="background: #0f766e; color: #ffffff; padding: 18px 24px;">',
    '    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.9;">LICC Men\'s Fellowship • Birthday Alert</div>',
    '    <h2 style="margin: 6px 0 0; font-size: 20px;">🎂 ' + escapeHtml(memberFullName) + "'s Birthday is Today!</h2>",
    '  </div>',
    '  <div style="padding: 22px 24px; background: #ffffff; line-height: 1.6;">',
    '    <p style="margin-top: 0;">Praise God <strong>' + escapeHtml(exco.name) + '</strong> (' + escapeHtml(exco.role) + '),</p>',
    '    <p>Today (<strong>' + escapeHtml(dobDisplay) + '</strong>) is our brother <strong>' + escapeHtml(memberFullName) + "</strong>'s birthday. Please reach out to celebrate and pray with him today.</p>",
    '    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px;">',
    '      <tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Full Name</td><td style="padding: 8px 12px; font-weight: 700;">' + escapeHtml(memberFullName) + '</td></tr>',
    '      <tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Birthday</td><td style="padding: 8px 12px; font-weight: 700;">' + escapeHtml(dobDisplay) + '</td></tr>',
    '      <tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Occupation</td><td style="padding: 8px 12px;">' + escapeHtml(occupationDisplay) + '</td></tr>',
    '      <tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Phone / WhatsApp</td><td style="padding: 8px 12px;">' + escapeHtml(memberPhoneDisplay) + '</td></tr>',
    '    </table>',
    waLink
      ? '    <p style="margin: 20px 0 8px;"><a href="' + escapeHtml(waLink) + '" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; font-weight: 700; padding: 10px 18px; border-radius: 8px;">💬 Send Birthday Wish on WhatsApp</a></p>'
      : '',
    '    <p style="font-size: 12px; color: #64748b; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px;">Sent automatically at 7:00 AM WAT by LICC Men\'s Fellowship Portal • Light Cathedral, Samonda, Ibadan.</p>',
    '  </div>',
    '</div>'
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: exco.email,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: SENDER_DISPLAY_NAME
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function appendBirthdayLog(sheet, entry) {
  const headers = SCHEMA.BirthdayAlertLogs;
  const record = {
    id: 'BLG-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000),
    sentDate: entry.sentDate || '',
    memberId: entry.memberId || '',
    memberName: entry.memberName || '',
    dob: entry.dob || '',
    excoId: entry.excoId || '',
    excoName: entry.excoName || '',
    excoEmail: entry.excoEmail || '',
    status: entry.status || '',
    error: entry.error || '',
    createdAt: new Date().toISOString()
  };
  const row = headers.map(function (h) { return record[h] === undefined || record[h] === null ? '' : String(record[h]); });
  const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length);
  range.setNumberFormat('@');
  range.setValues([row]);
}

// ----------------- DATE & RECIPIENT HELPERS -----------------

function getLagosDateParts(date) {
  const isoDate = Utilities.formatDate(date || new Date(), FELLOWSHIP_TIMEZONE, 'yyyy-MM-dd');
  const parts = isoDate.split('-');
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
    isoDate: isoDate
  };
}

function formatLagosMonthDay(date) {
  return Utilities.formatDate(date || new Date(), FELLOWSHIP_TIMEZONE, 'd MMM');
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function parseBirthdayMonthDay(dobValue) {
  if (!dobValue) return null;

  const monthMap = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };
  const maxDays = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let raw = String(dobValue).trim();
  if (!raw) return null;

  raw = raw
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. "25 Nov", "25-Nov", "25 November 1990"
  let match = raw.match(/^(\d{1,2})[\s\-\/,]+([A-Za-z]+)(?:[\s\-\/,]+\d{2,4})?$/);
  if (match) {
    const day = Number(match[1]);
    const month = monthMap[match[2].toLowerCase()];
    if (month && day >= 1 && day <= maxDays[month]) {
      return { month: month, day: day };
    }
  }

  // 2. "Nov 25", "November 25, 1990"
  match = raw.match(/^([A-Za-z]+)[\s\-\/,]+(\d{1,2})(?:[\s,/\-]+\d{2,4})?$/);
  if (match) {
    const month = monthMap[match[1].toLowerCase()];
    const day = Number(match[2]);
    if (month && day >= 1 && day <= maxDays[month]) {
      return { month: month, day: day };
    }
  }

  // 3. "YYYY-MM-DD" or "YYYY/MM/DD"
  match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (match) {
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= maxDays[month]) {
      return { month: month, day: day };
    }
  }

  // 4. "25/11" or "25-11-1990" (DD/MM Nigerian convention when ambiguous)
  match = raw.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/]\d{2,4})?$/);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    let day;
    let month;
    if (a > 12 && b >= 1 && b <= 12) {
      day = a; month = b;
    } else if (b > 12 && a >= 1 && a <= 12) {
      month = a; day = b;
    } else {
      day = a; month = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= maxDays[month]) {
      return { month: month, day: day };
    }
  }

  return null;
}

function isBirthdayOnDate(dobValue, dateParts) {
  const parsed = parseBirthdayMonthDay(dobValue);
  if (!parsed) return false;
  if (parsed.month === dateParts.month && parsed.day === dateParts.day) return true;
  if (parsed.month === 2 && parsed.day === 29 && !isLeapYear(dateParts.year) && dateParts.month === 2 && dateParts.day === 28) {
    return true;
  }
  return false;
}

function isValidMemberRecord(m) {
  const fName = String((m && m.firstName) || '').trim();
  const lName = String((m && m.lastName) || '').trim();
  const phone = String((m && m.whatsappPhone) || '').trim();
  if (!fName && !lName && !phone) return false;
  if (fName.toUpperCase() === 'N/A' && lName.toUpperCase() === 'N/A') return false;
  const id = String((m && m.id) || '').trim();
  const fullName = (fName + ' ' + lName).trim().toLowerCase();
  if (DUMMY_MEMBER_IDS.indexOf(id) !== -1 || DUMMY_MEMBER_NAMES.indexOf(fullName) !== -1) return false;
  return true;
}

function parseAlertFlag(value) {
  const text = String(value === undefined || value === null ? '' : value).trim().toUpperCase();
  if (!text) return null;
  if (['YES', 'TRUE', '1', 'Y', 'ON'].indexOf(text) !== -1) return true;
  if (['NO', 'FALSE', '0', 'N', 'OFF'].indexOf(text) !== -1) return false;
  return null;
}

function isDefaultAlertExco(exco) {
  const id = String((exco && exco.id) || '').trim().toUpperCase();
  const role = String((exco && exco.role) || '').trim().toUpperCase();
  return DEFAULT_ALERT_EXCO_IDS.indexOf(id) !== -1 || DEFAULT_ALERT_EXCO_ROLES.indexOf(role) !== -1;
}

function isValidEmail(email) {
  const cleaned = String(email || '').trim();
  return Boolean(cleaned) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
}

function normalizeWhatsAppDigits(phone) {
  const digits = digitsOnly(phone);
  if (!digits) return '';
  if (/^0[789][01]\d{8}$/.test(digits)) return '234' + digits.slice(1);
  if (/^[789][01]\d{8}$/.test(digits)) return '234' + digits;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return '';
}

function formatDisplayPhone(phone) {
  const digits = normalizeWhatsAppDigits(phone);
  return digits ? ('+' + digits) : String(phone || '').trim();
}

function resolveBirthdayAlertExcos(excos) {
  const list = Array.isArray(excos) ? excos : [];
  const hasExplicitFlags = list.some(function (ex) {
    return parseAlertFlag(ex && ex.birthdayAlert) !== null;
  });
  const seenEmails = {};
  const selected = [];

  list.forEach(function (exco) {
    const explicit = parseAlertFlag(exco && exco.birthdayAlert);
    const shouldAlert = hasExplicitFlags ? explicit === true : isDefaultAlertExco(exco);
    if (!shouldAlert) return;

    const email = String(exco.email || '').trim();
    const validEmail = isValidEmail(email);
    const emailKey = email.toLowerCase();
    if (validEmail && seenEmails[emailKey]) return;
    if (validEmail) seenEmails[emailKey] = true;

    selected.push({
      id: String(exco.id || ''),
      role: String(exco.role || ''),
      name: String(exco.name || ''),
      email: email,
      hasValidEmail: validEmail,
      status: validEmail ? 'READY' : 'NEEDS_EMAIL'
    });
  });

  return selected;
}

// ----------------- SHEET STORAGE HELPERS -----------------

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
      if (obj.dob) obj.dom = obj.dob;
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
