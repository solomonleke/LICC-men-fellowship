import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import {
  getAllMembers as getLocalMembers,
  getRawMemberById as getLocalRawMemberById,
  addMember as addLocalMember,
  updateMember as updateLocalMember,
  checkPhoneExists as checkLocalPhone,
  deleteMember as deleteLocalMember,
  getAllShowcases as getLocalShowcases,
  addShowcase as addLocalShowcase,
  likeShowcase as likeLocalShowcase,
  getCommentsForPost as getLocalComments,
  addComment as addLocalComment,
  getExcelStats as getLocalExcelStats,
  getAllExcos as getLocalExcos,
  getAllEvents as getLocalEvents,
  addEvent as addLocalEvent,
  deleteEvent as deleteLocalEvent,
  INITIAL_EXCOS
} from './excelDatabase.js';

import {
  getConfig as getSheetsConfig,
  updateGoogleSheetsConfig,
  testConnection as testSheetsConnection,
  getMembersFromSheet,
  getRawMemberByIdFromSheet,
  checkPhoneInSheet,
  addMemberToSheet,
  updateMemberInSheet,
  deleteMemberFromSheet,
  getShowcasesFromSheet,
  addShowcaseToSheet,
  likeShowcaseInSheet,
  getCommentsFromSheet,
  addCommentToSheet,
  getStatsFromSheet,
  getExcosFromSheet,
  getEventsFromSheet,
  addEventToSheet,
  deleteEventFromSheet,
  triggerBirthdayAlertsInSheet
} from './googleSheets.js';

import { buildBirthdayAlertPreview } from './birthdayService.js';
import {
  isValidEditPinFormat,
  hashEditPin,
  verifyEditPin,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearFailedPinAttempts
} from './pinSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_FILE_PATH = path.join(__dirname, 'data', 'licc_members_database.xlsx');
const ENV_FILE_PATH = path.join(__dirname, '..', '.env');

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'licc-exco-2026';

function requireAdmin(req, res, next) {
  const passcode = req.headers['x-admin-passcode'] || req.query.passcode || (req.body && req.body.passcode);
  if (!passcode || String(passcode).trim() !== ADMIN_PASSCODE) {
    return res.status(403).json({ error: 'Unauthorized: Designated EXCO Admin privileges required.' });
  }
  next();
}

app.use(cors());
app.use(express.json());

// Helper to check if Google Sheets is active
function isGoogleSheetsActive() {
  return getSheetsConfig().isConfigured;
}

// ----------------- HEALTH & CONFIG -----------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: "LICC Men's Fellowship API running",
    activeBackend: isGoogleSheetsActive() ?'Google Sheets (Live Cloud)': 'Local Excel (.xlsx)'
  });
});

app.get('/api/config/sheets', (req, res) => {
  const config = getSheetsConfig();
  res.json({
    isConfigured: config.isConfigured,
    url: config.url,
    tokenConfigured: Boolean(config.token)
  });
});

app.post('/api/config/sheets', async (req, res) => {
  try {
    const { url, token } = req.body;
    if (!url || !url.trim().startsWith('http')) {
      return res.status(400).json({ error: 'Please enter a valid Google Apps Script Web App URL starting with https://' });
    }

    updateGoogleSheetsConfig(url, token || 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET');

    // Test connection
    const test = await testSheetsConnection();

    // Persist to .env
    const envContent = `GOOGLE_SHEETS_URL=${url.trim()}\nGOOGLE_SHEETS_TOKEN=${(token || 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET').trim()}\n`;
    fs.writeFileSync(ENV_FILE_PATH, envContent);

    res.json({
      success: true,
      testResult: test,
      message: 'Google Sheets configuration updated and saved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/sheets/test', async (req, res) => {
  try {
    const { url } = req.body;
    if (url) {
      const testRes = await fetch(url.trim());
      const testJson = await testRes.json();
      return res.json({ ok: Boolean(testJson && testJson.ok), data: testJson });
    }
    const result = await testSheetsConnection();
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

// ----------------- MEMBERS ENDPOINTS -----------------

app.get('/api/members', async (req, res) => {
  try {
    if (isGoogleSheetsActive()) {
      try {
        const members = await getMembersFromSheet();
        if (Array.isArray(members) && members.length > 0) {
          return res.json(members);
        }
        const localMembers = await getLocalMembers();
        if (Array.isArray(localMembers) && localMembers.length > 0) {
          return res.json(localMembers);
        }
        if (Array.isArray(members)) {
          return res.json(members);
        }
      } catch (sheetError) {
        console.warn('Google Sheets members fetch failed, falling back to local Excel database:', sheetError.message);
      }
    }
    const members = await getLocalMembers();
    return res.json(members || []);
  } catch (error) {
    console.error('Members fetch error:', error);
    try {
      const fallback = await getLocalMembers();
      return res.json(fallback || []);
    } catch (localErr) {
      return res.json([]);
    }
  }
});

function validatePhone(phone) {
  if (!phone) return { isValid: false, error: 'Phone number is required.' };
  const cleaned = String(phone).trim().replace(/[\s\-\(\)\.]/g, '');
  if (/^0[789][01]\d{8}$/.test(cleaned)) return { isValid: true, normalized: '+234' + cleaned.slice(1) };
  if (/^\+234[789][01]\d{8}$/.test(cleaned)) return { isValid: true, normalized: cleaned };
  if (/^234[789][01]\d{8}$/.test(cleaned)) return { isValid: true, normalized: '+' + cleaned };
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return { isValid: true, normalized: cleaned };
  if (/^0[789][01]\d{7}$/.test(cleaned)) return { isValid: false, error: 'Incomplete number (10 digits). Nigerian phone numbers must be 11 digits (e.g. 0816 541 3812).' };
  return { isValid: false, error: 'Invalid phone format. Nigerian numbers must be 11 digits (e.g. 08012345678) or international (+234...).' };
}

app.get('/api/members/check-phone', async (req, res) => {
  try {
    const { phone, excludeId } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number parameter required' });
    }

    const validation = validatePhone(phone);
    if (!validation.isValid) {
      return res.json({ exists: false, isValid: false, error: validation.error, phone });
    }

    let exists = false;
    const lookupNumber = validation.normalized || String(phone);
    const exclude = excludeId ? String(excludeId).trim() : null;
    if (isGoogleSheetsActive()) {
      try {
        exists = await checkPhoneInSheet(lookupNumber, exclude);
        if (!exists && validation.normalized && validation.normalized.startsWith('+234')) {
          exists = await checkPhoneInSheet('0' + validation.normalized.slice(4), exclude);
        }
      } catch (err) {
        console.warn('Google Sheets check-phone failed, checking local Excel:', err.message);
        exists = await checkLocalPhone(lookupNumber, exclude);
        if (!exists && validation.normalized && validation.normalized.startsWith('+234')) {
          exists = await checkLocalPhone('0' + validation.normalized.slice(4), exclude);
        }
      }
    } else {
      exists = await checkLocalPhone(lookupNumber, exclude);
      if (!exists && validation.normalized && validation.normalized.startsWith('+234')) {
        exists = await checkLocalPhone('0' + validation.normalized.slice(4), exclude);
      }
    }

    res.json({ exists, isValid: true, normalized: validation.normalized, phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const { firstName, lastName, occupation, ageGroup, whatsappPhone, altPhone, dob, dom, editPin } = req.body;
    const finalDob = String(dob || dom || '').trim();
    if (!firstName || !lastName || !occupation || !ageGroup || !whatsappPhone || !finalDob) {
      return res.status(400).json({ error: 'Please provide all required fields (First Name, Last Name, Occupation, Age Group, WhatsApp Phone, Date of Birth).' });
    }

    if (!isValidEditPinFormat(editPin)) {
      return res.status(400).json({ error: 'Please choose a 4-digit Edit PIN (e.g. 4829) so you can safely update your profile later.' });
    }

    const phoneVal = validatePhone(whatsappPhone);
    if (!phoneVal.isValid) {
      return res.status(400).json({ error: phoneVal.error });
    }
    const finalPhone = phoneVal.normalized || whatsappPhone.trim();

    let finalAltPhone = undefined;
    if (altPhone && altPhone.trim()) {
      const altVal = validatePhone(altPhone);
      if (!altVal.isValid) {
        return res.status(400).json({ error: `Alternate phone error: ${altVal.error}` });
      }
      finalAltPhone = altVal.normalized || altPhone.trim();
    }

    const memberPayload = {
      id: `MEM-${Date.now().toString().slice(-6)}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      occupation: occupation.trim(),
      ageGroup,
      whatsappPhone: finalPhone,
      altPhone: finalAltPhone,
      dob: finalDob,
      dom: finalDob,
      createdAt: new Date().toISOString(),
      editPinHash: hashEditPin(editPin)
    };

    // Always persist to local Excel as guaranteed persistent storage
    const localMember = await addLocalMember(memberPayload);

    // Also attempt Google Sheets cloud sync if active
    let cloudMember = null;
    if (isGoogleSheetsActive()) {
      try {
        cloudMember = await addMemberToSheet(memberPayload);
      } catch (sheetErr) {
        if (String(sheetErr.message || '').includes('Duplicate entry')) {
          await deleteLocalMember(localMember.id).catch(() => {});
          return res.status(400).json({ error: sheetErr.message });
        }
        console.warn('Google Sheets member sync warning (saved locally):', sheetErr.message);
      }
    }

    res.status(201).json(cloudMember || localMember);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

async function findRawMemberForAuth(id) {
  if (isGoogleSheetsActive()) {
    try {
      const sheetMember = await getRawMemberByIdFromSheet(id);
      if (sheetMember) return { member: sheetMember, source: 'sheets' };
    } catch (err) {
      console.warn('Google Sheets raw member lookup failed, checking local Excel:', err.message);
    }
  }
  const localMember = await getLocalRawMemberById(id);
  if (localMember) return { member: localMember, source: 'local' };
  return null;
}

app.post('/api/members/:id/verify-pin', async (req, res) => {
  try {
    const memberId = String(req.params.id || '').trim();
    const passcode = req.headers['x-admin-passcode'] || (req.body && req.body.passcode);
    const isAdminReq = Boolean(passcode && String(passcode).trim() === ADMIN_PASSCODE);
    if (isAdminReq) {
      return res.json({ verified: true, mode: 'admin' });
    }

    const rate = checkPinRateLimit(memberId);
    if (!rate.allowed) {
      return res.status(429).json({ error: rate.message });
    }

    const found = await findRawMemberForAuth(memberId);
    if (!found) {
      return res.status(404).json({ error: 'Member profile not found.' });
    }

    if (!found.member.editPinHash) {
      return res.status(403).json({
        error: 'This profile was registered before Edit PINs were enabled. Please ask an EXCO Admin to edit it or assign your 4-digit Edit PIN.',
        requiresAdmin: true
      });
    }

    const pin = req.body && req.body.editPin;
    if (!isValidEditPinFormat(pin) || !verifyEditPin(pin, found.member.editPinHash)) {
      const fail = recordFailedPinAttempt(memberId);
      if (fail.locked) {
        return res.status(429).json({ error: 'Too many incorrect PIN attempts. Locked for 15 minutes. Ask an EXCO Admin for help.' });
      }
      return res.status(401).json({
        error: `Incorrect 4-digit Edit PIN. ${fail.remainingAttempts} attempt(s) remaining.`
      });
    }

    clearFailedPinAttempts(memberId);
    res.json({ verified: true, mode: 'pin' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const memberId = String(req.params.id || '').trim();
    const passcode = req.headers['x-admin-passcode'] || (req.body && req.body.passcode);
    const isAdminReq = Boolean(passcode && String(passcode).trim() === ADMIN_PASSCODE);

    const found = await findRawMemberForAuth(memberId);
    if (!found) {
      return res.status(404).json({ error: 'Member profile not found.' });
    }

    if (!isAdminReq) {
      const rate = checkPinRateLimit(memberId);
      if (!rate.allowed) {
        return res.status(429).json({ error: rate.message });
      }

      if (!found.member.editPinHash) {
        return res.status(403).json({
          error: 'This profile does not have an Edit PIN yet. Only an EXCO Admin can edit it or assign an initial PIN.',
          requiresAdmin: true
        });
      }

      const editPin = req.body && req.body.editPin;
      if (!isValidEditPinFormat(editPin) || !verifyEditPin(editPin, found.member.editPinHash)) {
        const fail = recordFailedPinAttempt(memberId);
        if (fail.locked) {
          return res.status(429).json({ error: 'Too many incorrect PIN attempts. Locked for 15 minutes. Ask an EXCO Admin for help.' });
        }
        return res.status(401).json({
          error: `Incorrect 4-digit Edit PIN. ${fail.remainingAttempts} attempt(s) remaining.`
        });
      }
      clearFailedPinAttempts(memberId);
    }

    const { firstName, lastName, occupation, ageGroup, whatsappPhone, altPhone, dob, dom, newEditPin } = req.body;
    const finalDob = String(dob || dom || '').trim();
    if (!firstName || !lastName || !occupation || !ageGroup || !whatsappPhone || !finalDob) {
      return res.status(400).json({ error: 'Please provide all required fields (First Name, Last Name, Occupation, Age Group, WhatsApp Phone, Date of Birth).' });
    }

    const phoneVal = validatePhone(whatsappPhone);
    if (!phoneVal.isValid) {
      return res.status(400).json({ error: phoneVal.error });
    }
    const finalPhone = phoneVal.normalized || whatsappPhone.trim();

    let finalAltPhone = '';
    if (altPhone && altPhone.trim()) {
      const altVal = validatePhone(altPhone);
      if (!altVal.isValid) {
        return res.status(400).json({ error: `Alternate phone error: ${altVal.error}` });
      }
      finalAltPhone = altVal.normalized || altPhone.trim();
    }

    let nextPinHash = undefined;
    if (newEditPin !== undefined && String(newEditPin).trim() !== '') {
      if (!isValidEditPinFormat(newEditPin)) {
        return res.status(400).json({ error: 'New Edit PIN must be exactly 4 digits.' });
      }
      nextPinHash = hashEditPin(newEditPin);
    }

    const updatePayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      occupation: occupation.trim(),
      ageGroup,
      whatsappPhone: finalPhone,
      altPhone: finalAltPhone,
      dob: finalDob,
      dom: finalDob,
      ...(nextPinHash !== undefined ? { editPinHash: nextPinHash } : {})
    };

    let cloudMember = null;
    if (isGoogleSheetsActive()) {
      try {
        cloudMember = await updateMemberInSheet(memberId, updatePayload);
      } catch (sheetErr) {
        if (String(sheetErr.message || '').includes('Unknown action')) {
          return res.status(409).json({
            error: 'Your deployed Google Apps Script Web App needs the updated google-apps-script/Code.gs (with "update" action) deployed before cloud profile edits can save.'
          });
        }
        if (String(sheetErr.message || '').includes('Duplicate entry')) {
          return res.status(400).json({ error: sheetErr.message });
        }
        console.warn('Google Sheets member update warning:', sheetErr.message);
      }
    }

    let localMember = null;
    try {
      localMember = await updateLocalMember(memberId, updatePayload);
    } catch (localErr) {
      if (!cloudMember) {
        return res.status(400).json({ error: localErr.message });
      }
      console.warn('Local Excel member update warning:', localErr.message);
    }

    if (!cloudMember && !localMember) {
      return res.status(404).json({ error: 'Member profile could not be updated in storage.' });
    }

    res.json(cloudMember || localMember);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/members/:id', requireAdmin, async (req, res) => {
  try {
    if (isGoogleSheetsActive()) {
      try {
        await deleteMemberFromSheet(req.params.id);
      } catch (sheetErr) {
        console.warn('Google Sheets member delete warning:', sheetErr.message);
      }
    }
    const success = await deleteLocalMember(req.params.id);
    if (success) {
      res.json({ message: 'Member deleted successfully' });
    } else {
      res.status(404).json({ error: 'Member not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- SHOWCASE ENDPOINTS -----------------

app.get('/api/showcases', async (req, res) => {
  try {
    if (isGoogleSheetsActive()) {
      try {
        const showcases = await getShowcasesFromSheet();
        if (Array.isArray(showcases) && showcases.length > 0) {
          return res.json(showcases);
        }
        const localShowcases = await getLocalShowcases();
        if (Array.isArray(localShowcases) && localShowcases.length > 0) {
          return res.json(localShowcases);
        }
        if (Array.isArray(showcases)) {
          return res.json(showcases);
        }
      } catch (sheetErr) {
        console.warn('Google Sheets showcases fetch failed, falling back to local Excel:', sheetErr.message);
      }
    }
    const showcases = await getLocalShowcases();
    res.json(showcases || []);
  } catch (error) {
    console.error('Showcases fetch error:', error);
    try {
      const fallback = await getLocalShowcases();
      return res.json(fallback || []);
    } catch (localErr) {
      console.warn('Local showcases fallback error:', localErr.message);
      res.json([]);
    }
  }
});

app.post('/api/showcases', async (req, res) => {
  try {
    const { authorPhone, authorName, title, category, description, imageUrl, whatsappContact } = req.body;
    if (!authorName || !title || !description) {
      return res.status(400).json({ error: 'Author Name, Title, and Description are required.' });
    }

    const payload = {
      authorPhone: authorPhone || '',
      authorName: authorName.trim(),
      title: title.trim(),
      category: category || 'General',
      description: description.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : '',
      whatsappContact: whatsappContact || authorPhone || ''
    };

    // Always persist to local Excel database first as guaranteed storage
    const localPost = await addLocalShowcase(payload);

    // Also attempt to sync to Google Sheets if configured
    let cloudPost = null;
    if (isGoogleSheetsActive()) {
      try {
        cloudPost = await addShowcaseToSheet(payload);
      } catch (sheetErr) {
        console.warn('Google Sheets showcase sync warning (saved locally):', sheetErr.message);
      }
    }

    res.status(201).json(cloudPost || localPost);
  } catch (error) {
    console.error('Create showcase error:', error);
    res.status(500).json({ error: error.message || 'Failed to publish showcase post' });
  }
});

app.post('/api/showcases/:id/like', async (req, res) => {
  try {
    let likes = 0;
    if (isGoogleSheetsActive()) {
      try {
        likes = await likeShowcaseInSheet(req.params.id);
        try { await likeLocalShowcase(req.params.id); } catch (e) { }
      } catch (sheetErr) {
        console.warn('Google Sheets like failed, falling back to local Excel:', sheetErr.message);
        likes = await likeLocalShowcase(req.params.id);
      }
    } else {
      likes = await likeLocalShowcase(req.params.id);
    }
    res.json({ likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- COMMENTS ENDPOINTS -----------------

app.get('/api/showcases/:id/comments', async (req, res) => {
  try {
    if (isGoogleSheetsActive()) {
      try {
        const comments = await getCommentsFromSheet(req.params.id);
        if (Array.isArray(comments)) return res.json(comments);
      } catch (sheetErr) {
        console.warn('Google Sheets comments fetch failed, falling back to local Excel:', sheetErr.message);
      }
    }
    const comments = await getLocalComments(req.params.id);
    res.json(comments || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/showcases/:id/comments', async (req, res) => {
  try {
    const { authorName, commentText } = req.body;
    if (!authorName || !commentText) {
      return res.status(400).json({ error: 'Author Name and Comment Text are required.' });
    }

    const payload = {
      postId: req.params.id,
      authorName: authorName.trim(),
      commentText: commentText.trim()
    };

    const localComment = await addLocalComment(payload);

    let cloudComment = null;
    if (isGoogleSheetsActive()) {
      try {
        cloudComment = await addCommentToSheet(payload);
      } catch (sheetErr) {
        console.warn('Google Sheets comment sync warning (saved locally):', sheetErr.message);
      }
    }

    res.status(201).json(cloudComment || localComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- ADMIN AUTHENTICATION -----------------

app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { passcode, excoId } = req.body;
    if (!passcode || String(passcode).trim() !== ADMIN_PASSCODE) {
      return res.status(401).json({ error: 'Incorrect EXCO admin passcode. Access denied.' });
    }

    let excos = INITIAL_EXCOS;
    try {
      excos = isGoogleSheetsActive() ? await getExcosFromSheet() : await getLocalExcos();
    } catch (e) {
      excos = INITIAL_EXCOS;
    }

    const matchedExco = excos.find(ex => ex.id === excoId) || excos[0] || {
      id: 'EXCO-ADMIN',
      name: 'EXCO Administrator',
      role: 'EXECUTIVE'
    };

    res.json({
      success: true,
      passcode: ADMIN_PASSCODE,
      admin: matchedExco,
      message: `Welcome, ${matchedExco.name} (${matchedExco.role})`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- EXCO MEMBERS ENDPOINTS -----------------

app.get('/api/excos', async (req, res) => {
  try {
    if (isGoogleSheetsActive()) {
      const excos = await getExcosFromSheet();
      return res.json(excos);
    }
    const excos = await getLocalExcos();
    res.json(excos);
  } catch (error) {
    console.error('Excos fetch error:', error);
    res.json(INITIAL_EXCOS);
  }
});

// ----------------- BIRTHDAY ALERTS ENDPOINTS -----------------

function maskEmailForPublic(email) {
  const str = String(email || '').trim();
  if (!str) return '';
  const atIndex = str.indexOf('@');
  if (atIndex <= 1) return '***';
  const local = str.slice(0, atIndex);
  const domain = str.slice(atIndex);
  return `${local.slice(0, 2)}***${domain}`;
}

async function loadMembersAndExcosForBirthday() {
  let members = [];
  let excos = INITIAL_EXCOS;
  let source = 'Local Excel (.xlsx)';

  if (isGoogleSheetsActive()) {
    try {
      const [sheetMembers, sheetExcos] = await Promise.all([
        getMembersFromSheet(),
        getExcosFromSheet()
      ]);
      if (Array.isArray(sheetMembers)) {
        members = sheetMembers;
        source = 'Google Sheets (Live Cloud)';
      }
      if (Array.isArray(sheetExcos) && sheetExcos.length > 0) {
        excos = sheetExcos;
      }
    } catch (err) {
      console.warn('Google Sheets birthday lookup failed, falling back to local Excel:', err.message);
    }
  }

  if (members.length === 0) {
    const localMembers = await getLocalMembers();
    if (Array.isArray(localMembers) && localMembers.length > 0) {
      members = localMembers;
      source = 'Local Excel (.xlsx)';
    }
  }

  if (excos === INITIAL_EXCOS && !isGoogleSheetsActive()) {
    try {
      const localExcos = await getLocalExcos();
      if (Array.isArray(localExcos) && localExcos.length > 0) {
        excos = localExcos;
      }
    } catch (e) {
      // fall back to INITIAL_EXCOS
    }
  }

  return { members, excos, source };
}

app.get('/api/birthdays/today', async (req, res) => {
  try {
    const passcode = req.headers['x-admin-passcode'] || req.query.passcode;
    const isAdminReq = Boolean(passcode && String(passcode).trim() === ADMIN_PASSCODE);

    const { members, excos, source } = await loadMembersAndExcosForBirthday();
    const preview = buildBirthdayAlertPreview(members, excos);

    res.json({
      date: preview.date,
      timezone: preview.timezone,
      source,
      birthdayMembers: preview.birthdayMembers.map(m => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        fullName: m.fullName,
        occupation: m.occupation,
        dob: m.dob,
        whatsappPhone: m.whatsappPhone
      })),
      alertExcos: preview.alertExcos.map(ex => ({
        id: ex.id,
        role: ex.role,
        name: ex.name,
        email: isAdminReq ? ex.email : maskEmailForPublic(ex.email),
        hasValidEmail: ex.hasValidEmail,
        status: ex.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/birthdays/run', requireAdmin, async (req, res) => {
  try {
    const dryRun = Boolean(req.body && req.body.dryRun);
    const force = Boolean(req.body && req.body.force);

    if (isGoogleSheetsActive()) {
      try {
        const result = await triggerBirthdayAlertsInSheet({ dryRun, force });
        return res.json(result);
      } catch (sheetErr) {
        if (String(sheetErr.message || '').includes('Unknown action')) {
          if (dryRun) {
            const { members, excos } = await loadMembersAndExcosForBirthday();
            const preview = buildBirthdayAlertPreview(members, excos);
            return res.json({
              ...preview,
              dryRun: true,
              counts: {
                celebrants: preview.birthdayMembers.length,
                recipientsConfigured: preview.alertExcos.length,
                sent: 0,
                skippedAlreadySent: 0,
                skippedMissingEmail: 0,
                failed: 0
              },
              results: [],
              warning: 'Apps Script Web App needs the updated google-apps-script/Code.gs deployed to send live Gmail alerts.'
            });
          }
          return res.status(409).json({
            error: 'Your deployed Google Apps Script Web App has not been updated yet. Copy google-apps-script/Code.gs into Apps Script and deploy a new version.'
          });
        }
        throw sheetErr;
      }
    }

    const { members, excos } = await loadMembersAndExcosForBirthday();
    const preview = buildBirthdayAlertPreview(members, excos);
    if (!dryRun) {
      return res.status(400).json({
        error: 'Live Gmail birthday alerts require Google Sheets Apps Script to be connected and deployed.',
        preview
      });
    }

    res.json({
      ...preview,
      dryRun: true,
      counts: {
        celebrants: preview.birthdayMembers.length,
        recipientsConfigured: preview.alertExcos.length,
        sent: 0,
        skippedAlreadySent: 0,
        skippedMissingEmail: 0,
        failed: 0
      },
      results: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- EVENTS ENDPOINTS -----------------

app.get('/api/events', async (req, res) => {
  try {
    if (isGoogleSheetsActive()) {
      const events = await getEventsFromSheet();
      return res.json(events);
    }
    const events = await getLocalEvents();
    res.json(events);
  } catch (error) {
    console.error('Events fetch error:', error);
    try {
      const local = await getLocalEvents();
      res.json(local);
    } catch (e) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/events', requireAdmin, async (req, res) => {
  try {
    const { title, category, eventDate, eventTime, venue, description, bannerUrl, createdBy } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Event title is required.' });
    }
    if (!eventDate || !eventDate.trim()) {
      return res.status(400).json({ error: 'Event date is required.' });
    }

    const eventPayload = {
      title: title.trim(),
      category: category || 'Monthly Meeting',
      eventDate: eventDate.trim(),
      eventTime: eventTime ? eventTime.trim() : '8:00 AM - 10:30 AM',
      venue: venue ? venue.trim() : 'Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.',
      description: description ? description.trim() : '',
      bannerUrl: bannerUrl ? bannerUrl.trim() : '',
      createdBy: createdBy ? createdBy.trim() : 'EXCO Secretariat'
    };

    let newEvent;
    if (isGoogleSheetsActive()) {
      newEvent = await addEventToSheet(eventPayload);
      try { await addLocalEvent(eventPayload); } catch (e) { }
    } else {
      newEvent = await addLocalEvent(eventPayload);
    }

    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/events/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (isGoogleSheetsActive()) {
      await deleteEventFromSheet(id);
      try { await deleteLocalEvent(id); } catch (e) { }
      return res.json({ message: 'Event deleted successfully from Google Sheets' });
    }
    const success = await deleteLocalEvent(id);
    if (success) {
      res.json({ message: 'Event deleted successfully from Excel Database' });
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- METADATA & STATS -----------------


app.get('/api/excel/stats', async (req, res) => {
  try {
    if (isGoogleSheetsActive()) {
      try {
        const sheetStats = await getStatsFromSheet();
        if (sheetStats) {
          return res.json({
            ...sheetStats,
            isGoogleSheets: true,
            sheetsUrl: getSheetsConfig().url
          });
        }
      } catch (sheetErr) {
        console.warn('Google Sheets stats fetch failed, falling back to local Excel:', sheetErr.message);
      }
    }

    const localStats = await getLocalExcelStats();
    res.json({
      ...localStats,
      source: 'Local Excel Workbook (.xlsx)',
      isGoogleSheets: false
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    try {
      const localStats = await getLocalExcelStats();
      return res.json({
        ...localStats,
        source: 'Local Excel Workbook (.xlsx)',
        isGoogleSheets: false
      });
    } catch (e) {
      console.warn('Local stats fallback error:', e.message);
      res.json({
        totalMembers: 0,
        totalShowcases: 0,
        totalComments: 0,
        source: 'Standby Mode',
        isGoogleSheets: isGoogleSheetsActive(),
        ageGroupBreakdown: {
          '18-29': 0,
          '30-39': 0,
          '40-49': 0,
          '50-59': 0,
          '60 and above': 0
        }
      });
    }
  }
});

app.get('/api/excel/download', (req, res) => {
  if (fs.existsSync(EXCEL_FILE_PATH)) {
    res.download(EXCEL_FILE_PATH, 'licc_members_database.xlsx', (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to download Excel file' });
      }
    });
  } else {
    res.status(404).json({ error: 'Local Excel file not found' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`LICC Backend Server running on http://localhost:${PORT}`);
    console.log(`Backend Mode: ${isGoogleSheetsActive() ? 'Google Sheets (Live Cloud)' : 'Local Excel (.xlsx)'}`);
  });
}

export default app;
