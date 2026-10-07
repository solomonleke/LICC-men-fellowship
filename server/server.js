import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import {
  getAllMembers as getLocalMembers,
  addMember as addLocalMember,
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
  checkPhoneInSheet,
  addMemberToSheet,
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
  deleteEventFromSheet
} from './googleSheets.js';

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
    message: 'LICC Men Fellowship API running',
    activeBackend: isGoogleSheetsActive() ? 'Google Sheets (Live Cloud)' : 'Local Excel (.xlsx)'
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
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number parameter required' });
    }

    const validation = validatePhone(phone);
    if (!validation.isValid) {
      return res.json({ exists: false, isValid: false, error: validation.error, phone });
    }

    let exists = false;
    const lookupNumber = validation.normalized || String(phone);
    if (isGoogleSheetsActive()) {
      try {
        exists = await checkPhoneInSheet(lookupNumber);
        if (!exists && validation.normalized && validation.normalized.startsWith('+234')) {
          exists = await checkPhoneInSheet('0' + validation.normalized.slice(4));
        }
      } catch (err) {
        console.warn('Google Sheets check-phone failed, checking local Excel:', err.message);
        exists = await checkLocalPhone(lookupNumber);
        if (!exists && validation.normalized && validation.normalized.startsWith('+234')) {
          exists = await checkLocalPhone('0' + validation.normalized.slice(4));
        }
      }
    } else {
      exists = await checkLocalPhone(lookupNumber);
      if (!exists && validation.normalized && validation.normalized.startsWith('+234')) {
        exists = await checkLocalPhone('0' + validation.normalized.slice(4));
      }
    }

    res.json({ exists, isValid: true, normalized: validation.normalized, phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const { firstName, lastName, occupation, ageGroup, whatsappPhone, altPhone } = req.body;
    if (!firstName || !lastName || !occupation || !ageGroup || !whatsappPhone) {
      return res.status(400).json({ error: 'Please provide all required fields (First Name, Last Name, Occupation, Age Group, WhatsApp Phone).' });
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
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      occupation: occupation.trim(),
      ageGroup,
      whatsappPhone: finalPhone,
      altPhone: finalAltPhone
    };

    // Always persist to local Excel as guaranteed persistent storage
    const localMember = await addLocalMember(memberPayload);

    // Also attempt Google Sheets cloud sync if active
    let cloudMember = null;
    if (isGoogleSheetsActive()) {
      try {
        cloudMember = await addMemberToSheet(memberPayload);
      } catch (sheetErr) {
        console.warn('Google Sheets member sync warning (saved locally):', sheetErr.message);
      }
    }

    res.status(201).json(cloudMember || localMember);
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
        if (Array.isArray(showcases)) {
          const localShowcases = await getLocalShowcases();
          // If Google Sheet is empty but local has showcases, prefer local
          if (showcases.length === 0 && localShowcases.length > 0) {
            return res.json(localShowcases);
          }
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
        try { await likeLocalShowcase(req.params.id); } catch (e) {}
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
      try { await addLocalEvent(eventPayload); } catch (e) {}
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
      try { await deleteLocalEvent(id); } catch (e) {}
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
