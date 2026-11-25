import crypto from 'crypto';

const PIN_REGEX = /^\d{4}$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory failed PIN attempt tracker keyed by member ID
const failedAttemptsByMember = new Map();

export function isValidEditPinFormat(pin) {
  return PIN_REGEX.test(String(pin ?? '').trim());
}

/**
 * Hashes a 4-digit Edit PIN with a per-record random salt using scrypt.
 */
export function hashEditPin(pin) {
  const cleaned = String(pin ?? '').trim();
  if (!isValidEditPinFormat(cleaned)) {
    throw new Error('Edit PIN must be exactly 4 digits.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(cleaned, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Verifies a 4-digit Edit PIN against a stored "salt:hash" string in constant time.
 */
export function verifyEditPin(pin, storedHash) {
  const cleaned = String(pin ?? '').trim();
  const rawStored = String(storedHash ?? '').trim();
  if (!isValidEditPinFormat(cleaned) || !rawStored || !rawStored.includes(':')) {
    return false;
  }
  const [salt, hexHash] = rawStored.split(':');
  if (!salt || !hexHash) return false;

  try {
    const expectedBuf = Buffer.from(hexHash, 'hex');
    const actualBuf = crypto.scryptSync(cleaned, salt, 32);
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

export function checkPinRateLimit(memberId, now = Date.now()) {
  const key = String(memberId || '').trim();
  const entry = failedAttemptsByMember.get(key);
  if (!entry) return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };

  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds,
      message: `Too many incorrect PIN attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s) or ask an EXCO Admin.`
    };
  }

  if (entry.lockedUntil && now >= entry.lockedUntil) {
    failedAttemptsByMember.delete(key);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  return { allowed: true, remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - entry.count) };
}

export function recordFailedPinAttempt(memberId, now = Date.now()) {
  const key = String(memberId || '').trim();
  const prev = failedAttemptsByMember.get(key);
  const nextCount = (prev && (!prev.lockedUntil || now >= prev.lockedUntil) ? prev.count : 0) + 1;
  const lockedUntil = nextCount >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_WINDOW_MS : 0;
  failedAttemptsByMember.set(key, { count: nextCount, lockedUntil });
  return {
    count: nextCount,
    locked: Boolean(lockedUntil),
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - nextCount)
  };
}

export function clearFailedPinAttempts(memberId) {
  failedAttemptsByMember.delete(String(memberId || '').trim());
}

/**
 * Strips editPinHash from member objects before sending them to clients.
 */
export function sanitizeMemberForClient(member) {
  if (!member) return member;
  const { editPinHash, ...rest } = member;
  const hasEditPin = typeof member.hasEditPin === 'boolean'
    ? member.hasEditPin
    : Boolean(String(editPinHash || '').trim());
  return {
    ...rest,
    hasEditPin
  };
}

