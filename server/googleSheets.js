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
  invalidateCache();
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

// ----------------- IN-MEMORY CACHE & DEDUPLICATION -----------------
const CACHE_TTL_MS = 15000; // 15 seconds read cache

const cache = {
  members: { data: null, timestamp: 0 },
  showcases: { data: null, timestamp: 0 },
  comments: { data: null, timestamp: 0 },
  events: { data: null, timestamp: 0 },
  excos: { data: null, timestamp: 0 }
};

export function invalidateCache(sheetName) {
  if (sheetName) {
    const key = sheetName.toLowerCase();
    if (cache[key]) cache[key].timestamp = 0;
  } else {
    Object.keys(cache).forEach(k => { cache[k].timestamp = 0; });
  }
}

// Track in-flight promises so identical simultaneous requests share the same promise
const inFlightRequests = new Map();

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

// Single-flight deduplicated caller for reads
async function callScriptDeduplicated(payload) {
  if (payload.action !== 'list') {
    return callScript(payload);
  }

  const flightKey = `${payload.sheet}_list`;
  if (inFlightRequests.has(flightKey)) {
    return inFlightRequests.get(flightKey);
  }

  const promise = callScript(payload).finally(() => {
    inFlightRequests.delete(flightKey);
  });

  inFlightRequests.set(flightKey, promise);
  return promise;
}

// ----------------- MEMBERS -----------------

export async function getMembersFromSheet() {
  const now = Date.now();
  if (cache.members.data && (now - cache.members.timestamp < CACHE_TTL_MS)) {
    return cache.members.data;
  }

  try {
    const rows = await callScriptDeduplicated({ sheet: 'Members', action: 'list' });
    const members = (rows || [])
      .filter(m => {
        const fName = String(m.firstName || '').trim();
        const lName = String(m.lastName || '').trim();
        const phone = String(m.whatsappPhone || '').trim();
        if (!fName && !lName && !phone) return false;
        if (fName.toUpperCase() === 'N/A' && lName.toUpperCase() === 'N/A') return false;
        if (isDummyMember(m)) return false;
        return true;
      })
      .reverse();

    cache.members.data = members;
    cache.members.timestamp = Date.now();
    return members;
  } catch (err) {
    console.warn('getMembersFromSheet fetch error:', err.message);
    // If we have previously cached data, return it instead of an empty array
    if (cache.members.data && cache.members.data.length > 0) {
      return cache.members.data;
    }
    return [];
  }
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
    // Invalidate member cache so subsequent fetches get fresh data
    invalidateCache('members');
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
  invalidateCache('members');
  return true;
}

// ----------------- SHOWCASES -----------------

export async function getShowcasesFromSheet() {
  const now = Date.now();
  if (cache.showcases.data && (now - cache.showcases.timestamp < CACHE_TTL_MS)) {
    return cache.showcases.data;
  }

  try {
    const [showcases, comments] = await Promise.all([
      callScriptDeduplicated({ sheet: 'Showcases', action: 'list' }).catch(err => {
        console.warn('Showcases sheet fetch warning:', err.message);
        return cache.showcases.data || [];
      }),
      callScriptDeduplicated({ sheet: 'Comments', action: 'list' }).catch(err => {
        console.warn('Comments sheet fetch warning:', err.message);
        return [];
      })
    ]);

    const commentsMap = {};
    (comments || []).forEach(c => {
      commentsMap[c.postId] = (commentsMap[c.postId] || 0) + 1;
    });

    const parsed = (showcases || [])
      .filter(p => p.title && p.authorName && !isDummyShowcase(p))
      .map(p => ({
        ...p,
        likes: Number(p.likes || 0),
        commentsCount: commentsMap[p.id] || 0
      }))
      .reverse();

    cache.showcases.data = parsed;
    cache.showcases.timestamp = Date.now();
    return parsed;
  } catch (err) {
    console.warn('Showcases fetch error:', err.message);
    if (cache.showcases.data && cache.showcases.data.length > 0) {
      return cache.showcases.data;
    }
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

  invalidateCache('showcases');
  return { ...newPost, likes: 0, commentsCount: 0 };
}

export async function likeShowcaseInSheet(id) {
  const newLikes = await callScript({
    sheet: 'Showcases',
    action: 'increment',
    id,
    field: 'likes'
  });
  invalidateCache('showcases');
  return Number(newLikes);
}

// ----------------- COMMENTS -----------------

export async function getCommentsFromSheet(postId) {
  const allComments = await callScriptDeduplicated({ sheet: 'Comments', action: 'list' });
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

  invalidateCache('comments');
  invalidateCache('showcases');
  return newComment;
}

// ----------------- STATS -----------------

export async function getStatsFromSheet() {
  // Leverage cached members and showcases so stats doesn't flood Google Apps Script with 3 redundant calls!
  const [members, showcases] = await Promise.all([
    getMembersFromSheet(),
    getShowcasesFromSheet()
  ]);

  const ageGroupBreakdown = {
    '18-29': 0,
    '30-39': 0,
    '40-49': 0,
    '50-59': 0,
    '60 and above': 0
  };

  (members || []).forEach(m => {
    if (ageGroupBreakdown[m.ageGroup] !== undefined) {
      ageGroupBreakdown[m.ageGroup]++;
    }
  });

  return {
    totalMembers: (members || []).length,
    totalShowcases: (showcases || []).length,
    totalComments: 0,
    source: 'Google Sheets (Live Cloud)',
    ageGroupBreakdown,
    lastModified: new Date().toISOString()
  };
}

// ----------------- EXCOS -----------------

export async function getExcosFromSheet() {
  const now = Date.now();
  if (cache.excos.data && (now - cache.excos.timestamp < CACHE_TTL_MS * 4)) {
    return cache.excos.data;
  }

  try {
    const excos = await callScriptDeduplicated({ sheet: 'Excos', action: 'list' });
    if (excos && Array.isArray(excos) && excos.length > 0) {
      const sorted = excos
        .filter(ex => ex.name && ex.role)
        .sort((a, b) => Number(a.order || 99) - Number(b.order || 99));
      if (sorted.length > 0) {
        cache.excos.data = sorted;
        cache.excos.timestamp = Date.now();
        return sorted;
      }
    }
  } catch (err) {
    console.warn('Excos sheet fetch error, using INITIAL_EXCOS:', err.message);
  }
  return INITIAL_EXCOS;
}

// ----------------- EVENTS -----------------

export async function getEventsFromSheet() {
  const now = Date.now();
  if (cache.events.data && (now - cache.events.timestamp < CACHE_TTL_MS)) {
    return cache.events.data;
  }

  try {
    const events = await callScriptDeduplicated({ sheet: 'Events', action: 'list' });
    const parsed = (events || [])
      .filter(e => e.title && e.eventDate)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    cache.events.data = parsed;
    cache.events.timestamp = Date.now();
    return parsed;
  } catch (err) {
    console.warn('Events sheet fetch error:', err.message);
    if (cache.events.data && cache.events.data.length > 0) {
      return cache.events.data;
    }
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

  invalidateCache('events');
  return newEvent;
}

export async function deleteEventFromSheet(id) {
  await callScript({ sheet: 'Events', action: 'delete', id });
  invalidateCache('events');
  return true;
}
