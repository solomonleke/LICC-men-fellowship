import type { Member, ShowcasePost } from '../types';

// Known seeded dummy records. Exact matches only — never broad substrings
// like "test", which would hide genuine records (e.g. "Latest", "Contest").
const DUMMY_MEMBER_IDS = new Set(['MEM-1001', 'MEM-1002', 'MEM-1003', 'MEM-1004', 'MEM-1005']);
const DUMMY_MEMBER_NAMES = new Set(['emmanuel adeyemi', 'david okonkwo']);
const DUMMY_SHOWCASE_IDS = new Set(['POST-5001']);
const DUMMY_SHOWCASE_AUTHORS = new Set(['emmanuel adeyemi', 'david okonkwo']);

export function isDummyMember(m: Partial<Member>): boolean {
  const id = String(m.id || '').trim();
  const fullName = `${String(m.firstName || '').trim()} ${String(m.lastName || '').trim()}`.toLowerCase();
  return DUMMY_MEMBER_IDS.has(id) || DUMMY_MEMBER_NAMES.has(fullName);
}

export function isDummyShowcase(p: Partial<ShowcasePost>): boolean {
  const id = String(p.id || '').trim();
  const author = String(p.authorName || '').trim().toLowerCase();
  return DUMMY_SHOWCASE_IDS.has(id) || DUMMY_SHOWCASE_AUTHORS.has(author);
}

export function isValidMember(m: Member): boolean {
  const fName = String(m.firstName || '').trim();
  const lName = String(m.lastName || '').trim();
  const phone = String(m.whatsappPhone || '').trim();
  if (!fName && !lName && !phone) return false;
  if (fName.toUpperCase() === 'N/A' && lName.toUpperCase() === 'N/A') return false;
  return !isDummyMember(m);
}

export function isValidShowcase(s: ShowcasePost): boolean {
  if (!String(s.title || '').trim() || !String(s.authorName || '').trim()) return false;
  return !isDummyShowcase(s);
}
