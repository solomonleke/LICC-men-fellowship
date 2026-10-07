import dotenv from 'dotenv';
dotenv.config();
import { INITIAL_EXCOS, isDummyMember, isDummyShowcase } from './excelDatabase.js';

const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwvQgCBSDiYmqUs_RY1U-XrsSsvEkh_bCC2YCWhYhe5Df0XNOi3zzdd9HiN1O_0Elpxxw/exec';
const DEFAULT_SHEETS_TOKEN = 'licc-fellowship-2026-secret-key';

let config = {
  url: process.env.GOOGLE_SHEETS_URL || DEFAULT_SHEETS_URL,
  token: process.env.GOOGLE_SHEETS_TOKEN || DEFAULT_SHEETS_TOKEN
};

export function updateGoogleSheetsConfig(newUrl, newToken) {
  config.url = newUrl ? newUrl.trim() : config.url;
  config.token = newToken ? newToken.trim() : config.token;
  process.env.GOOGLE_SHEETS_URL = config.url;
  process.env.GOOGLE_SHEETS_TOKEN = config.token;
  return config;
}

export function getConfig() {
  return {
    url: config.url,
    token: config.token ? '***CONFIGURED***' : '',
    isConfigured: Boolean(config.url && config.url.startsWith('http'))
  };
}

export async function testConnection() {
  if (!config.url) {
    return { ok: false, error: 'Google Sheets Web App URL is not configured' };
  }
  try {
    const res = await fetch(config.url, { redirect: 'follow' });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: 'Google Apps Script returned an HTML page instead of JSON. Ensure "Who has access" is set to "Anyone" when deploying as Web App.'
      };
    }
    return { ok: Boolean(json && json.ok), message: json.data || 'Connection successful' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function callScript(payload) {
  if (!config.url) {
    throw new Error('Google Sheets Web App URL is not configured');
  }

  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: config.token,
      ...payload
    }),
    redirect: 'follow'
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (parseErr) {
    console.warn('Google Sheets Web App returned non-JSON response:', text.slice(0, 160));
    if (text.includes('accounts.google.com') || text.includes('Sign in') || text.includes('<!DOCTYPE')) {
      throw new Error('Google Sheets Web App authorization error: Ensure deployment settings have "Who has access: Anyone".');
    }
    throw new Error(`Google Sheets responded with invalid JSON: ${text.slice(0, 120)}`);
  }

  if (!json.ok) {
    if (json.error === 'DUPLICATE') {
      throw new Error('DUPLICATE_PHONE');
    }
    throw new Error(json.error || 'Google Sheets API error');
  }
  return json.data;
}

// ----------------- MEMBERS -----------------

export async function getMembersFromSheet() {
  const rows = await callScript({ sheet: 'Members', action: 'list' });
  return (rows || [])
    .filter(m => {
      const fName = String(m.firstName || '').trim();
      const lName = String(m.lastName || '').trim();
      const phone = String(m.whatsappPhone || '').trim();
      const id = String(m.id || '');
      const fullName = `${fName} ${lName}`.toLowerCase();
      if (!fName && !lName && !phone) return false;
      if (fName.toUpperCase() === 'N/A' && lName.toUpperCase() === 'N/A') return false;
      if (isDummyMember(m)) return false;
      return true;
    })
    .reverse();
}

export async function checkPhoneInSheet(phone) {
  const members = await getMembersFromSheet();
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return false;
  return members.some(m => String(m.whatsappPhone || '').replace(/\D/g, '') === digits);
}

export async function addMemberToSheet(data) {
  const newMember = {
    id: `MEM-${Date.now().toString().slice(-6)}`,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    occupation: data.occupation.trim(),
    ageGroup: data.ageGroup,
    whatsappPhone: data.whatsappPhone.trim(),
    altPhone: data.altPhone ? data.altPhone.trim() : '',
    createdAt: new Date().toISOString()
  };

  try {
    await callScript({
      sheet: 'Members',
      action: 'append',
      record: newMember,
      uniqueField: 'whatsappPhone'
    });
    return newMember;
  } catch (err) {
    if (err.message === 'DUPLICATE_PHONE') {
      throw new Error(`Duplicate entry! WhatsApp number (${data.whatsappPhone}) already exists in Google Sheets.`);
    }
    throw err;
  }
}

export async function deleteMemberFromSheet(id) {
  await callScript({ sheet: 'Members', action: 'delete', id });
  return true;
}

// ----------------- SHOWCASES -----------------

export async function getShowcasesFromSheet() {
  try {
    const [showcases, comments] = await Promise.all([
      callScript({ sheet: 'Showcases', action: 'list' }).catch(err => {
        console.warn('Showcases sheet fetch warning:', err.message);
        return [];
      }),
      callScript({ sheet: 'Comments', action: 'list' }).catch(err => {
        console.warn('Comments sheet fetch warning:', err.message);
        return [];
      })
    ]);

    const commentsMap = {};
    (comments || []).forEach(c => {
      commentsMap[c.postId] = (commentsMap[c.postId] || 0) + 1;
    });

    return (showcases || [])
      .filter(p => p.title && p.authorName && !isDummyShowcase(p))
      .map(p => ({
        ...p,
        likes: Number(p.likes || 0),
        commentsCount: commentsMap[p.id] || 0
      })).reverse();
  } catch (err) {
    console.warn('Showcases fetch error:', err.message);
    return [];
  }
}

export async function addShowcaseToSheet(data) {
  const newPost = {
    id: `POST-${Date.now().toString().slice(-6)}`,
    authorPhone: data.authorPhone || '',
    authorName: data.authorName.trim(),
    title: data.title.trim(),
    category: data.category || 'General',
    description: data.description.trim(),
    imageUrl: data.imageUrl || '',
    whatsappContact: data.whatsappContact || data.authorPhone || '',
    createdAt: new Date().toISOString(),
    likes: '0'
  };

  await callScript({
    sheet: 'Showcases',
    action: 'append',
    record: newPost
  });

  return { ...newPost, likes: 0, commentsCount: 0 };
}

export async function likeShowcaseInSheet(id) {
  const newLikes = await callScript({
    sheet: 'Showcases',
    action: 'increment',
    id,
    field: 'likes'
  });
  return Number(newLikes);
}

// ----------------- COMMENTS -----------------

export async function getCommentsFromSheet(postId) {
  const allComments = await callScript({ sheet: 'Comments', action: 'list' });
  return (allComments || []).filter(c => c.postId === String(postId)).reverse();
}

export async function addCommentToSheet(data) {
  const newComment = {
    id: `COM-${Date.now().toString().slice(-6)}`,
    postId: String(data.postId),
    authorName: data.authorName.trim(),
    commentText: data.commentText.trim(),
    createdAt: new Date().toISOString()
  };

  await callScript({
    sheet: 'Comments',
    action: 'append',
    record: newComment
  });

  return newComment;
}

// ----------------- STATS -----------------

export async function getStatsFromSheet() {
  const [members, showcases, comments] = await Promise.all([
    callScript({ sheet: 'Members', action: 'list' }).catch(err => {
      console.warn('Members sheet fetch warning:', err.message);
      return [];
    }),
    callScript({ sheet: 'Showcases', action: 'list' }).catch(err => {
      console.warn('Showcases sheet fetch warning:', err.message);
      return [];
    }),
    callScript({ sheet: 'Comments', action: 'list' }).catch(err => {
      console.warn('Comments sheet fetch warning:', err.message);
      return [];
    })
  ]);

  const ageGroupBreakdown = {
    '18-29': 0,
    '30-39': 0,
    '40-49': 0,
    '50-59': 0,
    '60 and above': 0
  };

  const validMembers = (members || []).filter(m => {
    const fName = String(m.firstName || '').trim();
    const lName = String(m.lastName || '').trim();
    const phone = String(m.whatsappPhone || '').trim();
    if (!fName && !lName && !phone) return false;
    if (fName.toUpperCase() === 'N/A' && lName.toUpperCase() === 'N/A') return false;
    return true;
  });

  validMembers.forEach(m => {
    if (ageGroupBreakdown[m.ageGroup] !== undefined) {
      ageGroupBreakdown[m.ageGroup]++;
    }
  });

  const validShowcases = (showcases || []).filter(s =>
    s.title && s.authorName && !isDummyShowcase(s)
  );

  return {
    totalMembers: validMembers.length,
    totalShowcases: validShowcases.length,
    totalComments: (comments || []).length,
    source: 'Google Sheets (Live Cloud)',
    ageGroupBreakdown,
    lastModified: new Date().toISOString()
  };
}

// ----------------- EXCOS -----------------

export async function getExcosFromSheet() {
  try {
    const excos = await callScript({ sheet: 'Excos', action: 'list' });
    if (excos && Array.isArray(excos) && excos.length > 0) {
      return excos
        .filter(ex => ex.name && ex.role)
        .sort((a, b) => Number(a.order || 99) - Number(b.order || 99));
    }
  } catch (err) {
    console.warn('Excos sheet fetch error, using INITIAL_EXCOS:', err.message);
  }
  return INITIAL_EXCOS;
}

// ----------------- EVENTS -----------------

export async function getEventsFromSheet() {
  try {
    const events = await callScript({ sheet: 'Events', action: 'list' });
    return (events || [])
      .filter(e => e.title && e.eventDate)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  } catch (err) {
    console.warn('Events sheet fetch error:', err.message);
    return [];
  }
}

export async function addEventToSheet(data) {
  const newEvent = {
    id: `EVT-${Date.now().toString().slice(-6)}`,
    title: data.title.trim(),
    category: data.category || 'Monthly Meeting',
    eventDate: data.eventDate.trim(),
    eventTime: data.eventTime ? data.eventTime.trim() : '8:00 AM - 10:30 AM',
    venue: data.venue ? data.venue.trim() : 'Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.',
    description: data.description ? data.description.trim() : '',
    bannerUrl: data.bannerUrl ? data.bannerUrl.trim() : '',
    createdBy: data.createdBy ? data.createdBy.trim() : 'EXCO Secretariat',
    createdAt: new Date().toISOString()
  };

  await callScript({
    sheet: 'Events',
    action: 'append',
    record: newEvent
  });

  return newEvent;
}

export async function deleteEventFromSheet(id) {
  await callScript({ sheet: 'Events', action: 'delete', id });
  return true;
}
