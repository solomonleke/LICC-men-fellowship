import { Member, ShowcasePost, ShowcaseComment, BackendStats, ExcoMember, FellowshipEvent } from '../types';
import { INITIAL_EXCOS, DEFAULT_EVENTS } from '../constants/excos';

const API_BASE = '/api';

export async function fetchMembers(): Promise<Member[]> {
  try {
    const res = await fetch(`${API_BASE}/members`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API fetchMembers failed, attempting static fallback:', err);
  }

  try {
    const staticRes = await fetch('/data/members.json');
    if (staticRes.ok) {
      const data = await staticRes.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // ignore
  }

  return [];
}

export async function checkPhoneUniqueness(phone: string): Promise<{ exists: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/members/check-phone?phone=${encodeURIComponent(phone)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('checkPhoneUniqueness fallback triggered:', e);
  }
  return { exists: false };
}

export async function createMember(member: Omit<Member, 'id' | 'createdAt'>): Promise<Member> {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add member to database');
  }
  return data;
}

export async function deleteMember(id: string, passcode?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (passcode) headers['x-admin-passcode'] = passcode;

  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete member (requires EXCO Admin authorization)');
  }
}

export async function fetchShowcases(): Promise<ShowcasePost[]> {
  try {
    const res = await fetch(`${API_BASE}/showcases`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API fetchShowcases failed, attempting static fallback:', err);
  }

  try {
    const staticRes = await fetch('/data/showcases.json');
    if (staticRes.ok) {
      const data = await staticRes.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // ignore
  }

  return [];
}

export async function createShowcase(post: Omit<ShowcasePost, 'id' | 'createdAt' | 'likes'>): Promise<ShowcasePost> {
  const res = await fetch(`${API_BASE}/showcases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to publish showcase post');
  return data;
}

export async function likeShowcasePost(id: string): Promise<{ likes: number }> {
  try {
    const res = await fetch(`${API_BASE}/showcases/${id}/like`, { method: 'POST' });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('likeShowcasePost error:', e);
  }
  return { likes: 1 };
}

export async function fetchComments(postId: string): Promise<ShowcaseComment[]> {
  try {
    const res = await fetch(`${API_BASE}/showcases/${postId}/comments`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('fetchComments error:', e);
  }
  return [];
}

export async function createComment(postId: string, authorName: string, commentText: string): Promise<ShowcaseComment> {
  const res = await fetch(`${API_BASE}/showcases/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorName, commentText }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to submit comment');
  return data;
}

export async function fetchExcelStats(): Promise<BackendStats> {
  try {
    const res = await fetch(`${API_BASE}/excel/stats`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn('fetchExcelStats fallback triggered:', err);
  }

  return {
    totalMembers: 0,
    totalShowcases: 0,
    totalComments: 0,
    source: 'Standby / Cloud Fallback',
    isGoogleSheets: true,
    lastModified: new Date().toISOString(),
    ageGroupBreakdown: {
      '18-29': 0,
      '30-39': 0,
      '40-49': 0,
      '50-59': 0,
      '60 and above': 0
    }
  };
}

export function getExcelDownloadUrl(): string {
  return `${API_BASE}/excel/download`;
}

export async function fetchSheetsConfig(): Promise<{ isConfigured: boolean; url: string; tokenConfigured: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/config/sheets`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { isConfigured: true, url: 'https://script.google.com/macros/s/...', tokenConfigured: true };
}

export async function saveSheetsConfig(url: string, token?: string): Promise<{ success: boolean; message: string; testResult: any }> {
  const res = await fetch(`${API_BASE}/config/sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to save Google Sheets configuration');
  return data;
}

export async function testSheetsUrl(url?: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/config/sheets/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

// ----------------- ADMIN & EXCO APIS -----------------

export async function adminLogin(passcode: string, excoId?: string): Promise<{ success: boolean; admin: ExcoMember; passcode: string; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, excoId }),
    });

    if (res.ok) {
      return await res.json();
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      throw new Error(data.error || 'Authentication failed. Invalid passcode.');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Invalid passcode')) {
      throw err;
    }
    console.warn('API adminLogin unreachable, validating client-side credentials:', err);
  }

  // Client-side fallback authentication when server is offline
  if (passcode.trim() === 'licc-exco-2026') {
    const matchedExco = INITIAL_EXCOS.find(ex => ex.id === excoId) || INITIAL_EXCOS[0];
    return {
      success: true,
      passcode: 'licc-exco-2026',
      admin: matchedExco,
      message: `Welcome, ${matchedExco.name} (${matchedExco.role})`
    };
  }

  throw new Error('Incorrect EXCO admin passcode. Access denied.');
}

export async function fetchExcos(): Promise<ExcoMember[]> {
  try {
    const res = await fetch(`${API_BASE}/excos`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('API fetchExcos failed, checking static fallback:', err);
  }

  // Fallback to static public/data/excos.json
  try {
    const staticRes = await fetch('/data/excos.json');
    if (staticRes.ok) {
      const staticData = await staticRes.json();
      if (Array.isArray(staticData) && staticData.length > 0) return staticData;
    }
  } catch (err) {
    console.warn('Static /data/excos.json fallback failed:', err);
  }

  // Authoritative built-in fallback
  return INITIAL_EXCOS;
}

// ----------------- EVENTS APIS -----------------

export async function fetchEvents(): Promise<FellowshipEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('API fetchEvents failed, checking static fallback:', err);
  }

  // Fallback to static public/data/events.json
  try {
    const staticRes = await fetch('/data/events.json');
    if (staticRes.ok) {
      const staticData = await staticRes.json();
      if (Array.isArray(staticData) && staticData.length > 0) return staticData;
    }
  } catch (e) {
    // ignore
  }

  return DEFAULT_EVENTS;
}

export async function createEvent(
  event: Omit<FellowshipEvent, 'id' | 'createdAt'>,
  passcode: string
): Promise<FellowshipEvent> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-passcode': passcode
    },
    body: JSON.stringify(event),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create fellowship event');
  return data;
}

export async function deleteEvent(id: string, passcode: string): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: {
      'x-admin-passcode': passcode
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete event. Admin privileges required.');
  }
}
