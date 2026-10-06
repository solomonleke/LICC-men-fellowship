import { Member, ShowcasePost, ShowcaseComment, BackendStats, ExcoMember, FellowshipEvent } from '../types';

const API_BASE = '/api';

export async function fetchMembers(): Promise<Member[]> {
  const res = await fetch(`${API_BASE}/members`);
  if (!res.ok) throw new Error('Failed to fetch members directory');
  return res.json();
}

export async function checkPhoneUniqueness(phone: string): Promise<{ exists: boolean }> {
  const res = await fetch(`${API_BASE}/members/check-phone?phone=${encodeURIComponent(phone)}`);
  if (!res.ok) throw new Error('Failed to check phone number uniqueness');
  return res.json();
}

export async function createMember(member: Omit<Member, 'id' | 'createdAt'>): Promise<Member> {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });

  const data = await res.json();
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
    if (!res.ok) throw new Error('Failed to fetch showcase posts');
    return await res.json();
  } catch (err) {
    console.warn('fetchShowcases fallback triggered:', err);
    return [];
  }
}

export async function createShowcase(post: Omit<ShowcasePost, 'id' | 'createdAt' | 'likes'>): Promise<ShowcasePost> {
  const res = await fetch(`${API_BASE}/showcases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to publish showcase post');
  return data;
}

export async function likeShowcasePost(id: string): Promise<{ likes: number }> {
  const res = await fetch(`${API_BASE}/showcases/${id}/like`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to like post');
  return res.json();
}

export async function fetchComments(postId: string): Promise<ShowcaseComment[]> {
  const res = await fetch(`${API_BASE}/showcases/${postId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function createComment(postId: string, authorName: string, commentText: string): Promise<ShowcaseComment> {
  const res = await fetch(`${API_BASE}/showcases/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorName, commentText }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit comment');
  return data;
}

export async function fetchExcelStats(): Promise<BackendStats> {
  try {
    const res = await fetch(`${API_BASE}/excel/stats`);
    if (!res.ok) throw new Error('Failed to fetch database metrics');
    return await res.json();
  } catch (err: any) {
    console.warn('fetchExcelStats fallback triggered:', err);
    return {
      totalMembers: 0,
      totalShowcases: 0,
      totalComments: 0,
      source: 'Local Cache',
      lastModified: new Date().toISOString(),
      isGoogleSheets: false,
      ageGroupBreakdown: {
        '18-29': 0,
        '30-39': 0,
        '40-49': 0,
        '50-59': 0,
        '60 and above': 0
      }
    };
  }
}

export function getExcelDownloadUrl(): string {
  return `${API_BASE}/excel/download`;
}

export async function fetchSheetsConfig(): Promise<{ isConfigured: boolean; url: string; tokenConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/config/sheets`);
  if (!res.ok) throw new Error('Failed to fetch Google Sheets configuration');
  return res.json();
}

export async function saveSheetsConfig(url: string, token?: string): Promise<{ success: boolean; message: string; testResult: any }> {
  const res = await fetch(`${API_BASE}/config/sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, token }),
  });
  const data = await res.json();
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
  const res = await fetch(`${API_BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode, excoId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Authentication failed. Invalid passcode.');
  return data;
}

export async function fetchExcos(): Promise<ExcoMember[]> {
  const res = await fetch(`${API_BASE}/excos`);
  if (!res.ok) throw new Error('Failed to fetch EXCO members');
  return res.json();
}

// ----------------- EVENTS APIS -----------------

export async function fetchEvents(): Promise<FellowshipEvent[]> {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
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

  const data = await res.json();
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

