import { isDummyMember } from './excelDatabase.js';

export const FELLOWSHIP_TIMEZONE = 'Africa/Lagos';

export const DEFAULT_ALERT_EXCO_IDS = new Set(['EXCO-3', 'EXCO-4', 'EXCO-5']);
export const DEFAULT_ALERT_EXCO_ROLES = new Set([
  'GENERAL SECRETARY',
  'ASST. GEN. SEC.',
  'SOCIAL SECRETARY'
]);

const MONTH_NAME_MAP = {
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

const MAX_DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns { year, month, day, isoDate } in Africa/Lagos (WAT, UTC+1).
 */
export function getLagosDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: FELLOWSHIP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const isoDate = formatter.format(date); // YYYY-MM-DD
  const [y, m, d] = isoDate.split('-').map(Number);
  return { year: y, month: m, day: d, isoDate };
}

/**
 * Parses a member DOB string (e.g. "25 Nov", "Nov 25", "1992-11-25", "25/11")
 * into { month, day } or null if invalid.
 */
export function parseBirthdayMonthDay(dobValue) {
  if (dobValue === null || dobValue === undefined) return null;

  if (dobValue instanceof Date && !Number.isNaN(dobValue.getTime())) {
    return getLagosDateParts(dobValue);
  }

  let raw = String(dobValue).trim();
  if (!raw) return null;

  // Strip ordinal suffixes (1st, 2nd, 3rd, 4th) and trailing dots/commas
  raw = raw
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Day Month [optional Year]: "25 Nov", "25-Nov", "25 November 1990"
  let match = raw.match(/^(\d{1,2})[\s\-\/,]+([A-Za-z]+)(?:[\s\-\/,]+\d{2,4})?$/);
  if (match) {
    const day = Number(match[1]);
    const month = MONTH_NAME_MAP[match[2].toLowerCase()];
    if (month && day >= 1 && day <= MAX_DAYS_IN_MONTH[month]) {
      return { month, day };
    }
  }

  // 2. Month Day [optional , Year]: "Nov 25", "November 25, 1990", "Nov-25"
  match = raw.match(/^([A-Za-z]+)[\s\-\/,]+(\d{1,2})(?:[\s,/\-]+\d{2,4})?$/);
  if (match) {
    const month = MONTH_NAME_MAP[match[1].toLowerCase()];
    const day = Number(match[2]);
    if (month && day >= 1 && day <= MAX_DAYS_IN_MONTH[month]) {
      return { month, day };
    }
  }

  // 3. ISO format: "YYYY-MM-DD" or "YYYY/MM/DD"
  match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (match) {
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= MAX_DAYS_IN_MONTH[month]) {
      return { month, day };
    }
  }

  // 4. Numeric Day/Month or Month/Day [optional /Year]: "25/11", "25-11-1990"
  match = raw.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/]\d{2,4})?$/);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    let day;
    let month;

    if (a > 12 && b >= 1 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a >= 1 && a <= 12) {
      month = a;
      day = b;
    } else {
      // Nigerian/UK DD/MM convention when both <= 12
      day = a;
      month = b;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= MAX_DAYS_IN_MONTH[month]) {
      return { month, day };
    }
  }

  return null;
}

/**
 * Checks whether a DOB value matches the given { year, month, day } date.
 * Leap-day birthdays (29 Feb) celebrate on 28 Feb in non-leap years.
 */
export function isBirthdayOnDate(dobValue, dateParts) {
  const parsed = parseBirthdayMonthDay(dobValue);
  if (!parsed) return false;

  if (parsed.month === dateParts.month && parsed.day === dateParts.day) {
    return true;
  }

  if (
    parsed.month === 2 &&
    parsed.day === 29 &&
    !isLeapYear(dateParts.year) &&
    dateParts.month === 2 &&
    dateParts.day === 28
  ) {
    return true;
  }

  return false;
}

/**
 * Validates an email address format for Gmail / email alerts.
 */
export function isValidEmail(email) {
  const cleaned = String(email || '').trim();
  return Boolean(cleaned) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
}

/**
 * Normalizes a phone number into digits-only international format (without "+")
 * for direct WhatsApp wish links (e.g. "2348165413812").
 */
export function normalizeWhatsAppDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';

  // Local Nigerian 11-digit format: 0803... -> 234803...
  if (/^0[789][01]\d{8}$/.test(digits)) {
    return `234${digits.slice(1)}`;
  }

  // Sheet-stripped leading zero Nigerian 10-digit format: 803... -> 234803...
  if (/^[789][01]\d{8}$/.test(digits)) {
    return `234${digits}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return '';
}

/**
 * Formats a phone string cleanly with leading "+" for display in alerts.
 */
export function formatDisplayPhone(phone) {
  const digits = normalizeWhatsAppDigits(phone);
  return digits ? `+${digits}` : String(phone || '').trim();
}

/**
 * Parses an explicit birthdayAlert value (boolean, string, number) into true/false/null.
 */
export function parseAlertFlag(value) {
  if (value === true) return true;
  if (value === false) return false;
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return null;
  if (['YES', 'TRUE', '1', 'Y', 'ON'].includes(text)) return true;
  if (['NO', 'FALSE', '0', 'N', 'OFF'].includes(text)) return false;
  return null;
}

/**
 * Determines whether an EXCO record matches the default alert offices
 * (General Secretary, Asst. Gen. Sec., Social Secretary).
 */
export function isDefaultAlertExco(exco) {
  const id = String(exco?.id || '').trim().toUpperCase();
  const role = String(exco?.role || '').trim().toUpperCase();
  return DEFAULT_ALERT_EXCO_IDS.has(id) || DEFAULT_ALERT_EXCO_ROLES.has(role);
}

/**
 * Resolves which EXCO members should receive birthday Gmail alerts.
 * If any EXCO has an explicit birthdayAlert flag set, respects explicit flags;
 * otherwise defaults to EXCO-3, EXCO-4, and EXCO-5.
 */
export function resolveBirthdayAlertExcos(excos = []) {
  const list = Array.isArray(excos) ? excos : [];
  const hasExplicitFlags = list.some((ex) => parseAlertFlag(ex?.birthdayAlert) !== null);
  const seenEmails = new Set();
  const selected = [];

  for (const exco of list) {
    const explicit = parseAlertFlag(exco?.birthdayAlert);
    const shouldAlert = hasExplicitFlags ? explicit === true : isDefaultAlertExco(exco);
    if (!shouldAlert) continue;

    const email = String(exco?.email || '').trim();
    const validEmail = isValidEmail(email);
    const emailKey = email.toLowerCase();

    if (validEmail && seenEmails.has(emailKey)) continue;
    if (validEmail) seenEmails.add(emailKey);

    selected.push({
      id: String(exco?.id || ''),
      role: String(exco?.role || ''),
      name: String(exco?.name || ''),
      email,
      hasValidEmail: validEmail,
      status: validEmail ? 'READY' : 'NEEDS_EMAIL'
    });
  }

  return selected;
}

/**
 * Filters valid members whose birthday falls on the given date (Africa/Lagos).
 */
export function findTodaysBirthdayMembers(members = [], date = new Date()) {
  const dateParts = getLagosDateParts(date);
  const list = Array.isArray(members) ? members : [];

  return list.filter((m) => {
    const fName = String(m?.firstName || '').trim();
    const lName = String(m?.lastName || '').trim();
    const phone = String(m?.whatsappPhone || '').trim();
    if (!fName && !lName && !phone) return false;
    if (fName.toUpperCase() === 'N/A' && lName.toUpperCase() === 'N/A') return false;
    if (isDummyMember(m)) return false;

    const dobVal = m?.dob || m?.dom || '';
    return isBirthdayOnDate(dobVal, dateParts);
  });
}

/**
 * Builds a complete preview of today's birthday celebrants and EXCO email alert targets.
 */
export function buildBirthdayAlertPreview(members = [], excos = [], date = new Date()) {
  const dateParts = getLagosDateParts(date);
  const birthdayMembers = findTodaysBirthdayMembers(members, date).map((m) => ({
    id: String(m.id || ''),
    firstName: String(m.firstName || '').trim(),
    lastName: String(m.lastName || '').trim(),
    fullName: `${String(m.firstName || '').trim()} ${String(m.lastName || '').trim()}`.trim(),
    occupation: String(m.occupation || '').trim() || 'Fellowship Member',
    dob: String(m.dob || m.dom || '').trim(),
    whatsappPhone: formatDisplayPhone(m.whatsappPhone),
    whatsappDigits: normalizeWhatsAppDigits(m.whatsappPhone)
  }));

  const alertExcos = resolveBirthdayAlertExcos(excos);

  return {
    date: dateParts.isoDate,
    timezone: FELLOWSHIP_TIMEZONE,
    birthdayMembers,
    alertExcos
  };
}
